import { Output } from "@/common/Output";
import { Handler } from "@/common/handler";
import prettyBytes from "@/service/zip/pretty-bytes";
import { mkdirSync, writeFileSync } from "fs";
import { createExtractorFromData } from "node-unrar-js";
import { basename, join, parse, resolve } from "path";
import { Uri, commands, window, workspace } from "vscode";
import { handlerCommonDecompress } from "./decompressHandler";

interface FileInfo {
    name: string;
    entryName: string;
    fileSize: number;
    compressedSize: number;
    isDirectory?: boolean;
    children?: FileInfo[];
}

export async function handleRar(uri: Uri, handler: Handler) {
    const decompressPath = handlerCommonDecompress(uri, handler)
    handler.on('init', async () => {
        const data = (await workspace.fs.readFile(uri)) as Buffer;
        const extractor = await createExtractorFromData({ data });
        const list = extractor.getFileList();

        const { files, folderMap, filePaths } = buildFileTree(list.fileHeaders);

        handler.emit('size', prettyBytes(data.length));
        handler.emit('extension', 'rar');
        handler.emit('data', {
            files,
            folderMap,
            fileName: basename(uri.fsPath)
        });

        handler.on('openPath', async info => {
            const { entryName, isDirectory } = info;
            if (isDirectory) {
                handler.emit('openDir', entryName);
            } else {
                await commands.executeCommand('workbench.action.keepEditor');
                const tempPath = `${decompressPath}/${entryName}`;
                await extractFiles(extractor, decompressPath, [entryName]);
                const url = Uri.file(tempPath);
                commands.executeCommand('vscode.open', url);
            }
        }).on('autoExtract', async () => {
            window.showInformationMessage("Start extracting...")
            let target = resolve(uri.fsPath, '..');
            if (Object.keys(folderMap).length > 1) {
                target = join(target, parse(uri.fsPath).name);
                mkdirSync(target, { recursive: true });
            }
            const success = await extractFiles(extractor, target, filePaths);
            if (success) {
                window.showInformationMessage("Extract success!")
                commands.executeCommand('revealFileInOS', Uri.file(target));
            }
        })
    });
}

function buildFileTree(fileHeaders: Generator<any, any, any>): { files: FileInfo[], folderMap: { [key: string]: FileInfo }, filePaths: string[] } {
    const folderMap: { [key: string]: FileInfo } = {};
    const files: FileInfo[] = [];
    const filePaths: string[] = [];

    const headers = [...fileHeaders];
    for (const fileHeader of headers) {
        const path = fileHeader.name;
        const isDirectory = fileHeader.flags.directory;
        const dirPath = isDirectory ? path : path.substring(0, path.lastIndexOf('/'));
        if (!isDirectory) filePaths.push(path);

        if (!isDirectory) {
            const fileInfo: FileInfo = {
                name: basename(path),
                entryName: path,
                fileSize: fileHeader.unpSize,
                compressedSize: fileHeader.packSize,
                isDirectory: false
            };

            if (dirPath) {
                if (!folderMap[dirPath]) {
                    const dirInfo: FileInfo = {
                        name: basename(dirPath),
                        entryName: dirPath,
                        fileSize: 0,
                        compressedSize: 0,
                        isDirectory: true,
                        children: []
                    };
                    files.push(dirInfo);
                    folderMap[dirPath] = dirInfo;
                }
                folderMap[dirPath].children!.push(fileInfo);
            } else {
                files.push(fileInfo);
            }
        } else {
            if (!folderMap[path]) {
                const dirInfo: FileInfo = {
                    name: basename(path),
                    entryName: path,
                    fileSize: 0,
                    compressedSize: 0,
                    isDirectory: true,
                    children: []
                };
                files.push(dirInfo);
                folderMap[path] = dirInfo;
            }
        }
    }

    return { files, folderMap, filePaths };
}

async function extractFiles(extractor: any, targetPath: string, files: string[]) {
    try {
        const extracted = extractor.extract({ files });
        const extractedFiles = [...extracted.files];
        for (const file of extractedFiles) {
            const filePath = resolve(targetPath, file.fileHeader.name);
            mkdirSync(resolve(filePath, '..'), { recursive: true });
            writeFileSync(filePath, file.extraction);
        }
        return true;
    } catch (err) {
        Output.debug(err);
        window.showErrorMessage(err.message);
        return false;
    }
}