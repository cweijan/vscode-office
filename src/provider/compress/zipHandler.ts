import { Output } from "@/common/Output";
import { FileUtil } from "@/common/fileUtil";
import { getFileSuffix } from '@/common/fileSuffix';
import { Handler } from "@/common/handler";
import { isZipPasswordError } from '@/service/compress/passwordUtils';
import { parseJarInfo } from '@/service/compress/jarInfo';
import { planExtractTarget, resolveContainedPath, revealExtractResult } from '@/service/compress/archiveUtils';
import prettyBytes from "@/service/zip/pretty-bytes";
import { ZipArchive } from "@/service/zip/zipArchive";
import { mkdirSync, writeFileSync } from "fs";
import { basename, resolve } from "path";
import { i18n } from '@/common/global';
import { Uri, commands, window, workspace } from "vscode";
import { handlerCommonDecompress } from "./decompressHandler";

function applyPassword(current: string | undefined, input?: string) {
    return input !== undefined ? (input.trim() || undefined) : current;
}

export async function handleZip(uri: Uri, handler: Handler) {
    const decompressPath = handlerCommonDecompress(uri, handler);
    let archivePassword: string | undefined;
    let filenameEncoding: string | undefined;

    handler.on('init', async () => {
        const data = (await workspace.fs.readFile(uri)) as Buffer;
        const opened = await ZipArchive.open(data);
        let { files, folderMap, fileMap } = opened;
        const { archive, encrypted, encoding } = opened;
        filenameEncoding = encoding;

        const suffix = getFileSuffix(uri.fsPath);
        const extension = suffix.startsWith('.') ? suffix.slice(1) : suffix;

        handler.emit('encrypted', encrypted);
        handler.emit('encoding', encoding);
        handler.emit('extension', extension);
        handler.emit('size', prettyBytes(data.length));

        let jarInfo;
        if (suffix === '.jar') {
            try {
                jarInfo = await parseJarInfo(archive, fileMap);
            } catch (err) {
                Output.debug(err);
            }
        }

        handler.emit('data', {
            files, folderMap,
            fileName: basename(uri.fsPath),
            jarInfo,
        });

        handler.on('changeEncoding', async (encoding) => {
            filenameEncoding = encoding;
            handler.emit('encoding', encoding);
            const parsed = await archive.parse(encoding);
            files = parsed.files;
            folderMap = parsed.folderMap;
            fileMap = parsed.fileMap;
            handler.emit('data', {
                files, folderMap,
                fileName: basename(uri.fsPath),
                jarInfo: suffix === '.jar' ? await parseJarInfo(archive, fileMap).catch(() => undefined) : undefined,
            });
        }).on('openPath', async (payload) => {
            const entry = payload?.entry ?? payload;
            const { entryName, isDirectory } = entry;
            archivePassword = applyPassword(archivePassword, payload?.password);

            if (isDirectory) {
                handler.emit('openDir', entryName);
                return;
            }

            const file = fileMap[entryName];
            const needsPassword = Boolean(file?.encrypted) || encrypted;
            if (needsPassword && !archivePassword) return;

            await commands.executeCommand('workbench.action.keepEditor');
            const tempPath = resolveContainedPath(decompressPath, entryName);
            mkdirSync(resolve(tempPath, '..'), { recursive: true });
            try {
                writeFileSync(tempPath, await archive.readEntry(file, archivePassword));
                commands.executeCommand('vscode.open', Uri.file(tempPath));
            } catch (err) {
                Output.debug(err);
                if (isZipPasswordError(err)) {
                    archivePassword = undefined;
                    handler.emit('passwordError');
                    handler.emit('extractToast', { type: 'error', message: i18n('ext.compress.wrongPassword') });
                } else {
                    handler.emit('extractToast', { type: 'error', message: (err as Error).message });
                }
            }
        }).on('autoExtract', async (inputPassword?: string) => {
            archivePassword = applyPassword(archivePassword, inputPassword);
            if (encrypted && !archivePassword) return;

            handler.emit('extractToast', { type: 'loading', message: i18n('ext.compress.startExtract') });
            try {
                const plan = planExtractTarget(uri.fsPath, files.length);
                if (plan.createSubfolder) {
                    mkdirSync(plan.targetDir, { recursive: true });
                }
                const filePaths = Object.keys(fileMap);
                await archive.extractAllTo(plan.targetDir, archivePassword, fileMap);
                handler.emit('extractToast', { type: 'success', message: i18n('ext.compress.extractSuccess') });
                await revealExtractResult(plan, filePaths);
            } catch (err) {
                Output.debug(err);
                if (isZipPasswordError(err)) {
                    archivePassword = undefined;
                    handler.emit('passwordError');
                    handler.emit('extractToast', { type: 'error', message: i18n('ext.compress.wrongPassword') });
                } else {
                    handler.emit('extractToast', { type: 'error', message: (err as Error).message });
                }
            }
        }).on('addFile', async (currentDir = '') => {
            const defaultUri = await FileUtil.getLastPath('connectChoose');
            const uris = await window.showOpenDialog({ defaultUri });
            if (!uris) return;
            const fileUri = uris[0];
            const buf = await workspace.fs.readFile(fileUri) as Buffer;
            const prefix = currentDir ? `${currentDir}/` : '';
            await archive.addFile(`${prefix}${basename(fileUri.fsPath)}`, buf, filenameEncoding);
            await workspace.fs.writeFile(uri, archive.toBuffer());
            handler.emit('saveDone');
            handler.emit('zipChange');
        }).on('removeFile', async entryName => {
            await archive.removeFile(entryName, filenameEncoding);
            await workspace.fs.writeFile(uri, archive.toBuffer());
            handler.emit('saveDone');
            handler.emit('zipChange');
        });
    });
}
