import { Output } from '@/common/Output';
import { Handler } from '@/common/handler';
import { planExtractTarget, revealExtractResult } from '@/service/compress/archiveUtils';
import { buildFileTree } from '@/service/compress/fileTree';
import { extractTarEntries, formatTarModifyTime, listTarEntries } from '@/service/compress/tarUtils';
import prettyBytes from '@/service/zip/pretty-bytes';
import { mkdirSync } from 'fs';
import { basename } from 'path';
import { Uri, commands, window, workspace } from 'vscode';
import { handlerCommonDecompress } from './decompressHandler';

export async function handleTarGz(uri: Uri, handler: Handler, gzip = true) {
    const decompressPath = handlerCommonDecompress(uri, handler);
    handler.on('init', async () => {
        const data = (await workspace.fs.readFile(uri)) as Buffer;
        const tarEntries = await listTarEntries(data, gzip);
        const items = tarEntries.map((entry) => ({
            path: entry.path,
            fileSize: entry.size,
            compressedSize: entry.size,
            isDirectory: entry.isDirectory,
            modifyDateTime: formatTarModifyTime(entry.mtime),
        }));
        const { files, folderMap, filePaths } = buildFileTree(items);

        handler.emit('size', prettyBytes(data.length));
        handler.emit('extension', gzip ? 'tar.gz' : 'tar');
        handler.emit('data', {
            files,
            folderMap,
            fileName: basename(uri.fsPath),
        });

        handler.on('openPath', async (info) => {
            const { entryName, isDirectory } = info;
            if (isDirectory) {
                handler.emit('openDir', entryName);
            } else {
                await commands.executeCommand('workbench.action.keepEditor');
                await extractTarEntries(data, decompressPath, gzip, [entryName]);
                commands.executeCommand('vscode.open', Uri.file(`${decompressPath}/${entryName}`));
            }
        }).on('autoExtract', async () => {
            window.showInformationMessage('Start extracting...');
            const plan = planExtractTarget(uri.fsPath, filePaths.length);
            if (plan.createSubfolder) {
                mkdirSync(plan.targetDir, { recursive: true });
            }
            try {
                await extractTarEntries(data, plan.targetDir, gzip);
                window.showInformationMessage('Extract success!');
                await revealExtractResult(plan, filePaths);
            } catch (err) {
                Output.debug(err);
                window.showErrorMessage((err as Error).message);
            }
        });
    });
}
