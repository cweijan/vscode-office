import { Output } from "@/common/Output";
import { FileUtil } from "@/common/fileUtil";
import { Handler } from "@/common/handler";
import { parseZipAsTree } from "@/service/zip/zipUtils";
import { existsSync, mkdirSync, rm, writeFileSync } from "fs";
import { tmpdir } from "os";
import { basename, extname, join, parse, resolve } from "path";
import { Uri, commands, env, window, workspace } from "vscode";

export async function handleZip(uri: Uri, handler: Handler) {
    // delete update
    handler.on('init', async () => {
        const data = (await workspace.fs.readFile(uri)) as Buffer
        const basePath = `${tmpdir()}/officeZip.${new Date().getTime()}`;
        let { zip, files, folderMap, fileMap } = parseZipAsTree(data)
        handler.emit('data', {
            files, folderMap,
            fileName: basename(uri.fsPath)
        })

        handler.on('changeEncoding', async (encoding) => {
            const info = parseZipAsTree(data, { encoding });
            zip = info.zip;
            files = info.files;
            folderMap = info.folderMap;
            fileMap = info.fileMap;
            handler.emit('data', {
                files, folderMap,
                fileName: basename(uri.fsPath)
            })
        }).on('openPath', async info => {
            const { entryName, isDirectory } = info
            if (isDirectory) {
                handler.emit('openDir', entryName)
            } else {
                await commands.executeCommand('workbench.action.keepEditor')
                const file = fileMap[entryName]
                const tempPath = `${basePath}/${entryName}`
                mkdirSync(resolve(tempPath, '..'), { recursive: true })
                writeFileSync(tempPath, file.getData())
                const url = Uri.file(tempPath);
                if (['.xlsx', '.csv'].includes(extname(tempPath)?.toLowerCase())) {
                    return env.openExternal(url);
                }
                commands.executeCommand('vscode.open', url);
            }
        }).on('autoExtract', () => {
            window.showInformationMessage("Start extracting...")
            let target = resolve(uri.fsPath, '..');
            if (files.length > 1) {
                target = join(target, parse(uri.fsPath).name)
                mkdirSync(target, { recursive: true })
            }
            zip.extractAllToAsync(target, true, false, (err) => {
                if (err) {
                    Output.debug(err)
                    window.showErrorMessage(err.message)
                } else {
                    setTimeout(() => {
                        window.showInformationMessage("Extract success!")
                        commands.executeCommand('revealFileInOS', Uri.file(target))
                    }, 100);
                }
            });
        }).on('addFile', async (currentDir = '') => {
            const defaultUri = FileUtil.getLastPath('connectChoose')
            const uris = await window.showOpenDialog({ defaultUri })
            if (!uris) return;
            const uri = uris[0]
            const buf = await workspace.fs.readFile(uri) as Buffer
            const prefix = currentDir ? `${currentDir}/` : '';
            zip.addFile(`${prefix}${basename(uri.fsPath)}`, buf)
            await workspace.fs.writeFile(uri, zip.toBuffer())
            handler.emit('zipChange')
        }).on('removeFile', async entryName => {
            zip.deleteFile(entryName)
            await workspace.fs.writeFile(uri, zip.toBuffer())
            handler.emit('zipChange')
        }).on('dispose', () => {
            if (existsSync(basePath)) rm(basePath, { recursive: true, force: true }, null)
        })
    })
}