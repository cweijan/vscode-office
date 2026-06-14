import { Output } from "@/common/Output";
import { Handler } from "@/common/handler";
import { buildFileTree } from '@/service/compress/fileTree';
import { planExtractTarget, revealExtractResult } from '@/service/compress/archiveUtils';
import prettyBytes from "@/service/zip/pretty-bytes";
import { mkdirSync, writeFileSync } from "fs";
import { createExtractorFromData, UnrarError } from "node-unrar-js";
import { basename, resolve } from "path";
import { Uri, commands, window, workspace } from "vscode";
import { handlerCommonDecompress } from "./decompressHandler";

function applyPassword(current: string | undefined, input?: string) {
    return input !== undefined ? (input.trim() || undefined) : current;
}

export async function handleRar(uri: Uri, handler: Handler) {
    const decompressPath = handlerCommonDecompress(uri, handler);
    let archivePassword: string | undefined;

    handler.on('init', async () => {
        const data = (await workspace.fs.readFile(uri)) as Buffer;
        const extractor = await createExtractorFromData({
            data: new Uint8Array(data).buffer as ArrayBuffer,
            password: archivePassword,
        });
        const list = extractor.getFileList();
        const headers = [...list.fileHeaders];
        const encrypted = list.arcHeader.flags.headerEncrypted
            || headers.some(h => h.flags.encrypted);

        const { files, folderMap, filePaths } = buildFileTree(headers.map((fileHeader) => ({
            path: fileHeader.name,
            fileSize: fileHeader.unpSize,
            compressedSize: fileHeader.packSize,
            isDirectory: fileHeader.flags.directory,
        })));

        handler.emit('encrypted', encrypted);
        handler.emit('size', prettyBytes(data.length));
        handler.emit('extension', 'rar');
        handler.emit('data', {
            files,
            folderMap,
            fileName: basename(uri.fsPath)
        });

        handler.on('openPath', async (payload) => {
            const entry = payload?.entry ?? payload;
            const { entryName, isDirectory } = entry;
            archivePassword = applyPassword(archivePassword, payload?.password);

            if (isDirectory) {
                handler.emit('openDir', entryName);
                return;
            }
            if (encrypted && !archivePassword) return;

            await commands.executeCommand('workbench.action.keepEditor');
            const tempPath = `${decompressPath}/${entryName}`;
            const success = await extractFiles(extractor, decompressPath, [entryName], archivePassword);
            if (success) {
                commands.executeCommand('vscode.open', Uri.file(tempPath));
            } else if (archivePassword && encrypted) {
                archivePassword = undefined;
                handler.emit('passwordError');
            }
        }).on('autoExtract', async (inputPassword?: string) => {
            archivePassword = applyPassword(archivePassword, inputPassword);
            if (encrypted && !archivePassword) return;

            window.showInformationMessage("Start extracting...");
            const plan = planExtractTarget(uri.fsPath, filePaths.length);
            if (plan.createSubfolder) {
                mkdirSync(plan.targetDir, { recursive: true });
            }
            const success = await extractFiles(extractor, plan.targetDir, filePaths, archivePassword);
            if (success) {
                window.showInformationMessage("Extract success!");
                await revealExtractResult(plan, filePaths);
            } else if (archivePassword && encrypted) {
                archivePassword = undefined;
                handler.emit('passwordError');
            }
        });
    });
}

async function extractFiles(
    extractor: Awaited<ReturnType<typeof createExtractorFromData>>,
    targetPath: string,
    files: string[],
    password?: string,
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
        if (err instanceof UnrarError && err.reason === 'ERAR_BAD_PASSWORD') {
            window.showErrorMessage('Wrong password');
        } else {
            window.showErrorMessage((err as Error).message);
        }
        return false;
    }
}
