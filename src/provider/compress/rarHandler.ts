import { Output } from "@/common/Output";
import { Handler } from "@/common/handler";
import { buildFileTree } from '@/service/compress/fileTree';
import prettyBytes from "@/service/zip/pretty-bytes";
import { mkdirSync, writeFileSync } from "fs";
import { createExtractorFromData, UnrarError } from "node-unrar-js";
import { basename, join, parse, resolve } from "path";
import { Uri, commands, window, workspace } from "vscode";
import { handlerCommonDecompress } from "./decompressHandler";

export async function handleRar(uri: Uri, handler: Handler) {
    const decompressPath = handlerCommonDecompress(uri, handler);
    let archivePassword: string | undefined;

    handler.on('changePassword', (password?: string) => {
        archivePassword = password?.trim() || undefined;
        handler.emit('init');
    });

    handler.on('init', async () => {
        handler.emit('passwordEnabled', true);
        const data = (await workspace.fs.readFile(uri)) as Buffer;
        const extractor = await createExtractorFromData({
            data: new Uint8Array(data).buffer as ArrayBuffer,
            password: archivePassword,
        });
        const list = extractor.getFileList();
        const headers = [...list.fileHeaders];
        const encrypted = list.arcHeader.flags.headerEncrypted
            || headers.some(h => h.flags.encrypted);

        handler.emit('encrypted', encrypted);
        const { files, folderMap, filePaths } = buildFileTree(headers.map((fileHeader) => ({
            path: fileHeader.name,
            fileSize: fileHeader.unpSize,
            compressedSize: fileHeader.packSize,
            isDirectory: fileHeader.flags.directory,
        })));

        handler.emit('size', prettyBytes(data.length));
        handler.emit('extension', 'rar');
        handler.emit('data', {
            files,
            folderMap,
            fileName: basename(uri.fsPath)
        });

        if (encrypted && archivePassword) {
            handler.emit('passwordOk');
        }

        handler.on('openPath', async info => {
            const { entryName, isDirectory } = info;
            if (isDirectory) {
                handler.emit('openDir', entryName);
            } else {
                await commands.executeCommand('workbench.action.keepEditor');
                const tempPath = `${decompressPath}/${entryName}`;
                const success = await extractFiles(extractor, decompressPath, [entryName], archivePassword, encrypted);
                if (success) {
                    commands.executeCommand('vscode.open', Uri.file(tempPath));
                }
            }
        }).on('autoExtract', async () => {
            window.showInformationMessage("Start extracting...");
            let target = resolve(uri.fsPath, '..');
            if (Object.keys(folderMap).length > 1) {
                target = join(target, parse(uri.fsPath).name);
                mkdirSync(target, { recursive: true });
            }
            const success = await extractFiles(extractor, target, filePaths, archivePassword, encrypted);
            if (success) {
                window.showInformationMessage("Extract success!");
                commands.executeCommand('revealFileInOS', Uri.file(target));
            }
        });
    });
}

async function extractFiles(
    extractor: Awaited<ReturnType<typeof createExtractorFromData>>,
    targetPath: string,
    files: string[],
    password?: string,
    encrypted?: boolean,
) {
    try {
        const extracted = extractor.extract({ files, password });
        for (const file of extracted.files) {
            const filePath = resolve(targetPath, file.fileHeader.name);
            mkdirSync(resolve(filePath, '..'), { recursive: true });
            writeFileSync(filePath, file.extraction!);
        }
        return true;
    } catch (err) {
        Output.debug(err);
        if (encrypted && !password) {
            window.showErrorMessage('This archive is password protected. Enter the password in the toolbar.');
        } else if (err instanceof UnrarError && err.reason === 'ERAR_BAD_PASSWORD') {
            window.showErrorMessage('Wrong password');
        } else {
            window.showErrorMessage((err as Error).message);
        }
        return false;
    }
}
