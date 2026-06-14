import { Output } from "@/common/Output";
import { FileUtil } from "@/common/fileUtil";
import { Handler } from "@/common/handler";
import { isZipPasswordError } from '@/service/compress/passwordUtils';
import prettyBytes from "@/service/zip/pretty-bytes";
import { ZipArchive } from "@/service/zip/zipArchive";
import { mkdirSync, writeFileSync } from "fs";
import { basename, join, parse, resolve } from "path";
import { Uri, commands, window, workspace } from "vscode";
import { handlerCommonDecompress } from "./decompressHandler";

export async function handleZip(uri: Uri, handler: Handler) {
    const decompressPath = handlerCommonDecompress(uri, handler);
    let archivePassword: string | undefined;
    let filenameEncoding: string | undefined;

    handler.on('changePassword', (password?: string) => {
        archivePassword = password?.trim() || undefined;
        handler.emit('init');
    });

    handler.on('init', async () => {
        handler.emit('passwordEnabled', true);
        const data = (await workspace.fs.readFile(uri)) as Buffer;
        let { archive, files, folderMap, fileMap, encrypted } = await ZipArchive.open(data, { encoding: filenameEncoding });

        handler.emit('encrypted', encrypted);
        handler.emit('size', prettyBytes(data.length));
        handler.emit('data', {
            files, folderMap,
            fileName: basename(uri.fsPath)
        });

        if (encrypted && archivePassword) {
            try {
                await archive.verifyPassword(fileMap, archivePassword);
                handler.emit('passwordOk');
            } catch (err) {
                handler.emit('passwordError');
                window.showErrorMessage(isZipPasswordError(err) ? 'Wrong password' : (err as Error).message);
            }
        }

        handler.on('changeEncoding', async (encoding) => {
            filenameEncoding = encoding;
            const parsed = await archive.parse(encoding);
            files = parsed.files;
            folderMap = parsed.folderMap;
            fileMap = parsed.fileMap;
            handler.emit('data', {
                files, folderMap,
                fileName: basename(uri.fsPath)
            });
        }).on('openPath', async info => {
            const { entryName, isDirectory } = info;
            if (isDirectory) {
                handler.emit('openDir', entryName);
            } else {
                await commands.executeCommand('workbench.action.keepEditor');
                const file = fileMap[entryName];
                const tempPath = `${decompressPath}/${entryName}`;
                mkdirSync(resolve(tempPath, '..'), { recursive: true });
                try {
                    writeFileSync(tempPath, await archive.readEntry(file, archivePassword));
                    commands.executeCommand('vscode.open', Uri.file(tempPath));
                } catch (err) {
                    Output.debug(err);
                    if (file?.encrypted && !archivePassword) {
                        window.showErrorMessage('This archive is password protected. Enter the password in the toolbar.');
                    } else {
                        window.showErrorMessage(isZipPasswordError(err) ? 'Wrong password' : (err as Error).message);
                    }
                }
            }
        }).on('autoExtract', async () => {
            window.showInformationMessage("Start extracting...");
            let target = resolve(uri.fsPath, '..');
            if (files.length > 1) {
                target = join(target, parse(uri.fsPath).name);
                mkdirSync(target, { recursive: true });
            }
            try {
                await archive.extractAllTo(target, archivePassword, fileMap);
                window.showInformationMessage("Extract success!");
                commands.executeCommand('revealFileInOS', Uri.file(target));
            } catch (err) {
                Output.debug(err);
                if (encrypted && !archivePassword) {
                    window.showErrorMessage('This archive is password protected. Enter the password in the toolbar.');
                } else {
                    window.showErrorMessage(isZipPasswordError(err) ? 'Wrong password' : (err as Error).message);
                }
            }
        }).on('addFile', async (currentDir = '') => {
            const defaultUri = FileUtil.getLastPath('connectChoose');
            const uris = await window.showOpenDialog({ defaultUri });
            if (!uris) return;
            const fileUri = uris[0];
            const buf = await workspace.fs.readFile(fileUri) as Buffer;
            const prefix = currentDir ? `${currentDir}/` : '';
            await archive.addFile(`${prefix}${basename(fileUri.fsPath)}`, buf, filenameEncoding);
            await workspace.fs.writeFile(uri, archive.toBuffer());
            handler.emit('zipChange');
        }).on('removeFile', async entryName => {
            await archive.removeFile(entryName, filenameEncoding);
            await workspace.fs.writeFile(uri, archive.toBuffer());
            handler.emit('zipChange');
        });
    });
}
