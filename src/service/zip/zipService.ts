import { Hanlder } from "@/common/handler";
import { mkdirSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { basename, extname, resolve } from "path";
import { Uri, commands, env, extensions, workspace } from "vscode";
import { parseZipAsTree } from "./zipUtils";

export class ZipService {

    constructor(private uri: Uri, private handler: Hanlder) { }

    public async bind() {

        const readTask = workspace.fs.readFile(this.uri)

        const handler = this.handler;
        handler.on('init', async () => {
            const data = (await readTask) as Buffer
            const basePath = `${tmpdir()}/officeZip.${new Date().getTime()}`;
            const { files, folderMap, fileMap } = parseZipAsTree(data)
            handler.emit('data', {
                files, folderMap,
                fileName: basename(this.uri.fsPath)
            }).on('open', async info => {
                const { entryName, isDirectory } = info
                if (isDirectory) {
                    handler.emit('open', entryName)
                } else {
                    await commands.executeCommand('workbench.action.keepEditor')
                    const file = fileMap[entryName]
                    const tempPath = `${basePath}/${entryName}`
                    mkdirSync(resolve(tempPath, '..'), { recursive: true })
                    writeFileSync(tempPath, file.getData())
                    const url = Uri.file(tempPath);
                    if (extname(tempPath)?.toLowerCase() == '.xlsx' && extensions.getExtension(`cweijan.vscode-office`) == null) {
                        return env.openExternal(url);
                    }
                    commands.executeCommand('vscode.open', url);
                }
            })
        })
    }

}