import { Output } from '@/common/Output';
import { Handler } from '@/common/handler';
import { getArchiveBaseName } from '@/service/compress/archiveUtils';
import { buildFileTree } from '@/service/compress/fileTree';
import prettyBytes from '@/service/zip/pretty-bytes';
import iconv from 'iconv-lite';
import { mkdirSync } from 'fs';
import { basename, dirname, join, parse, relative, resolve, sep } from 'path';
import SevenZip from '7z-wasm';
import { Uri, commands, window, workspace } from 'vscode';
import { handlerCommonDecompress } from './decompressHandler';

interface SevenZipEntry {
    path: string;
    fileSize: number;
    compressedSize: number;
    isDirectory: boolean;
    modifyDateTime?: string | null;
}

export async function handleSevenZip(uri: Uri, handler: Handler) {
    const decompressPath = handlerCommonDecompress(uri, handler);
    let archivePassword: string | undefined;
    let filenameEncoding: string | undefined;

    handler.on('changePassword', (password?: string) => {
        archivePassword = password?.trim() || undefined;
        handler.emit('init');
    });

    handler.on('changeEncoding', (encoding: string) => {
        filenameEncoding = encoding;
        handler.emit('init');
    });

    handler.on('init', async () => {
        handler.emit('passwordEnabled', true);
        const stat = await workspace.fs.stat(uri);

        try {
            const { entries, encrypted } = await listSevenZipEntries(uri.fsPath, archivePassword, filenameEncoding);
            const { files, folderMap, filePaths } = buildFileTree(entries);

            handler.emit('encrypted', encrypted);
            handler.emit('size', prettyBytes(stat.size));
            handler.emit('extension', '7z');
            handler.emit('data', {
                files,
                folderMap,
                fileName: basename(uri.fsPath),
            });

            if (encrypted && archivePassword) {
                handler.emit('passwordOk');
            }

            handler.on('openPath', async (info) => {
                const { entryName, isDirectory } = info;
                if (isDirectory) {
                    handler.emit('openDir', entryName);
                } else {
                    await commands.executeCommand('workbench.action.keepEditor');
                    const tempPath = `${decompressPath}/${entryName}`;
                    const success = await extractSevenZipEntries(
                        uri.fsPath,
                        decompressPath,
                        [entryName],
                        archivePassword,
                        filenameEncoding,
                    );
                    if (success) {
                        commands.executeCommand('vscode.open', Uri.file(tempPath));
                    }
                }
            }).on('autoExtract', async () => {
                window.showInformationMessage('Start extracting...');
                let target = resolve(uri.fsPath, '..');
                if (filePaths.length > 1) {
                    target = join(target, getArchiveBaseName(uri.fsPath));
                    mkdirSync(target, { recursive: true });
                }
                const success = await extractSevenZipEntries(uri.fsPath, target, undefined, archivePassword, filenameEncoding);
                if (success) {
                    window.showInformationMessage('Extract success!');
                    commands.executeCommand('revealFileInOS', Uri.file(target));
                }
            });
        } catch (err) {
            Output.debug(err);
            if (isSevenZipPasswordError(err)) {
                if (archivePassword) {
                    handler.emit('passwordError');
                    window.showErrorMessage('Wrong password');
                } else {
                    window.showErrorMessage('This archive is password protected. Enter the password in the toolbar.');
                }
            } else {
                window.showErrorMessage((err as Error).message);
            }
        }
    });
}

async function listSevenZipEntries(archivePath: string, password?: string, encoding?: string) {
    const stdout = await runSevenZipCommand(dirname(archivePath), [
        'l',
        '-slt',
        '-ba',
        ...getSevenZipCharsetArgs(encoding),
        ...(password ? [`-p${password}`] : []),
        basename(archivePath),
    ], encoding);
    // 7z-wasm stdout omits the dash separators between entries, so split on each "Path = " line.
    const blocks = stdout.split(/\r?\n(?=Path = )/);
    const entries: SevenZipEntry[] = [];
    let encrypted = false;

    for (const block of blocks) {
        const info: Record<string, string> = {};
        for (const line of block.split(/\r?\n/)) {
            const match = line.match(/^([^=]+) = (.*)$/);
            if (match) {
                info[match[1].trim()] = match[2].trim();
            }
        }

        if (!info.Path) {
            continue;
        }

        const path = info.Path.replace(/\\/g, '/');
        const isDirectory = info.Folder === '+'
            || path.endsWith('/')
            || /^D(\s|$)/.test(info.Attributes ?? '');

        if (!isDirectory && info.Size === undefined) {
            continue;
        }

        const fileSize = Number(info.Size ?? 0);
        const compressedSize = Number(info['Packed Size'] ?? info.Size ?? 0);

        encrypted = encrypted || info.Encrypted === '+';
        entries.push({
            path: isDirectory && !path.endsWith('/') ? `${path}/` : path,
            fileSize,
            compressedSize,
            isDirectory,
            modifyDateTime: info.Modified ?? null,
        });
    }

    return { entries, encrypted };
}

async function extractSevenZipEntries(
    archivePath: string,
    targetPath: string,
    entryNames?: string[],
    password?: string,
    encoding?: string,
) {
    try {
        mkdirSync(targetPath, { recursive: true });
        const args = [
            'x',
            '-y',
            '-aoa',
            ...getSevenZipCharsetArgs(encoding),
            ...(password ? [`-p${password}`] : []),
            `-o${toMountedPath(parse(archivePath).root, targetPath)}`,
            basename(archivePath),
            ...(entryNames ?? []),
        ];
        await runSevenZipCommand(dirname(archivePath), args, encoding);
        return true;
    } catch (err) {
        Output.debug(err);
        if (password && isSevenZipPasswordError(err)) {
            window.showErrorMessage('Wrong password');
        } else if (!password && isSevenZipPasswordError(err)) {
            window.showErrorMessage('This archive is password protected. Enter the password in the toolbar.');
        } else {
            window.showErrorMessage((err as Error).message);
        }
        return false;
    }
}

async function runSevenZipCommand(cwd: string, args: string[], encoding?: string) {
    const stdoutBytes: number[] = [];
    const stderrBytes: number[] = [];
    const module = await SevenZip({
        stdout: (charCode) => {
            if (charCode !== null) {
                stdoutBytes.push(charCode);
            }
        },
        stderr: (charCode) => {
            if (charCode !== null) {
                stderrBytes.push(charCode);
            }
        },
    });

    const hostRoot = parse(cwd).root;
    const mountRoot = '/nodefs';
    const mountedCwd = toMountedPath(hostRoot, cwd);

    module.FS.mkdir(mountRoot);
    module.FS.mount(module.NODEFS, { root: hostRoot }, mountRoot);
    module.FS.chdir(mountedCwd);

    try {
        module.callMain(args);
    } catch (err) {
        const stderr = decodeSevenZipOutput(stderrBytes, encoding);
        const stdout = decodeSevenZipOutput(stdoutBytes, encoding);
        throw new Error(stderr.trim() || stdout.trim() || (err as Error).message);
    }

    return decodeSevenZipOutput(stdoutBytes, encoding);
}

function getSevenZipCharsetArgs(encoding?: string) {
    if (!encoding || encoding === 'utf8') {
        return ['-sccUTF-8', '-scsUTF-8'];
    }
    return ['-sccUTF-8', '-scsWIN'];
}

function decodeSevenZipOutput(bytes: number[], encoding?: string) {
    const buffer = Buffer.from(bytes);
    if (!encoding || encoding === 'utf8') {
        return buffer.toString('utf8');
    }
    return iconv.decode(buffer, encoding);
}

function toMountedPath(root: string, fsPath: string) {
    const mounted = relative(root, fsPath).split(sep).join('/');
    return mounted ? `/nodefs/${mounted}` : '/nodefs';
}

function isSevenZipPasswordError(err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return /password|encrypted|headers error/i.test(message);
}