import { Hanlder } from "@/common/handler";
import { Uri, workspace } from "vscode";
import { parseZipAsTree } from "./zipUtils";
import { basename } from "path";

export class ZipService {

    constructor(private uri: Uri, private handler: Hanlder) { }

    public async bind() {

        const readTask = workspace.fs.readFile(this.uri)

        const handler = this.handler;
        handler.on('init', async () => {
            const data = (await readTask) as Buffer
            const { files, folderMap, fileMap } = parseZipAsTree(data)
            handler.emit('data', {
                files, folderMap,
                fileName: basename(this.uri.fsPath)
            }).on('open', filePath => {
                const file = fileMap[filePath]
                console.log(file)
            })
        })
    }

}