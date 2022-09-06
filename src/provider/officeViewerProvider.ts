import { spawn } from 'child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'fs';
import { basename, extname, parse, resolve } from 'path';
import { TextEncoder } from 'util';
import * as vscode from 'vscode';
import { Hanlder } from '../common/handler';
import { Output } from '../common/Output';
import { Util } from '../common/util';
import { tmpdir } from 'os';
import { workspace } from 'vscode';
import mammoth from "mammoth";

/**
 * support view office files
 */
export class OfficeViewerProvider implements vscode.CustomReadonlyEditorProvider {

    private extensionPath: string;

    constructor(private context: vscode.ExtensionContext) {
        this.extensionPath = context.extensionPath;
    }

    public openCustomDocument(uri: vscode.Uri, openContext: vscode.CustomDocumentOpenContext, token: vscode.CancellationToken): vscode.CustomDocument | Thenable<vscode.CustomDocument> {
        return { uri, dispose: (): void => { } };
    }
    public resolveCustomEditor(document: vscode.CustomDocument, webviewPanel: vscode.WebviewPanel, token: vscode.CancellationToken): void | Thenable<void> {
        const uri = document.uri;
        const webview = webviewPanel.webview;
        const folderPath = vscode.Uri.joinPath(uri, '..')
        webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.file(this.extensionPath), folderPath]
        }

        const ext = extname(uri.fsPath).toLowerCase()
        let htmlPath: string | null = null;

        const handler = Hanlder.bind(webviewPanel, uri);
        if (ext.match(/\.(jpg|png|svg|gif|apng|bmp|ico|cur|jpeg|pjpeg|pjp|tif|tiff|webp)$/i)) {
            this.handleImage(uri, webview)
            handler.on("fileChange", () => {
                this.handleImage(uri, webview)
            })
            return;
        }


        switch (ext) {
            case ".xlsx":
            case ".xlsm":
            case ".xls":
            case ".csv":
            case ".ods":
                htmlPath = this.handleXlsx(uri, handler)
                break;
            case ".ttf":
            case ".woff":
            case ".otf":
                this.handleFont(document, handler)
                break;
            case ".docx":
            case ".dotx":
                this.handleDocx(uri, webview)
                break;
            case ".class":
                this.handleClass(uri, webviewPanel);
                break;
            case ".pdf":
                this.handlePdf(uri, webview);
                handler.on("fileChange", () => {
                    this.handlePdf(uri, webview);
                })
                break;
            case ".htm":
            case ".html":
                webview.html = Util.buildPath(readFileSync(uri.fsPath, 'utf8'), webview, folderPath.fsPath);
                Util.listen(webviewPanel, uri, () => {
                    webviewPanel.webview.html = Util.buildPath(readFileSync(uri.fsPath, 'utf8'), webviewPanel.webview, folderPath.fsPath);
                })
                break;
            default:
                vscode.commands.executeCommand('vscode.openWith', uri, "default");
        }

        if (htmlPath != null) {
            webview.html = Util.buildPath(readFileSync(this.extensionPath + "/resource/" + htmlPath, 'utf8'), webview, this.extensionPath + "/resource")
                .replace("$autoTheme", workspace.getConfiguration("vscode-office").get<boolean>("autoTheme") + '')
        }

    }

    private handleDocx(uri: vscode.Uri, webview: vscode.Webview) {
        mammoth.convertToHtml({ path: uri.fsPath })
            .then((result: any) => {
                console.debug(result.messages)
                webview.html =
                    Util.buildPath(
                        readFileSync(this.extensionPath + "/resource/word.html", 'utf8').replace("{{content}}", result.value)
                            .replace("$autoTheme", workspace.getConfiguration("vscode-office").get<boolean>("autoTheme") + '')
                        , webview, this.extensionPath + "/resource"
                    )
            });
    }

    private async handleClass(uri: vscode.Uri, panel: vscode.WebviewPanel) {
        if (uri.scheme != "file") {
            vscode.commands.executeCommand('vscode.openWith', uri, "default");
            return;
        }

        const tempPath = `${tmpdir()}/office_temp_java`
        if (!existsSync(tempPath)) {
            mkdirSync(tempPath)
        }

        const java = spawn("java", ['-cp', '../resource/java-decompiler.jar', 'org.jetbrains.java.decompiler.main.decompiler.ConsoleDecompiler', uri.fsPath, tempPath], { cwd: __dirname })
        java.stdout.on('data', (data) => {
            console.log(data.toString("utf8"))
            if (data.toString("utf8").indexOf("done") == -1) {
                return;
            }
            const fileName = `${tempPath}/${parse(uri.fsPath).name}.java`;
            setTimeout(() => {
                vscode.window.showTextDocument(vscode.Uri.file(fileName).with({ scheme: "decompile_java", query: new Date().getTime().toString() }));
            }, 10);
        });

        java.stderr.on('data', (data) => {
            Output.log(data.toString("utf8"))
        });


    }


    private handleImage(uri: vscode.Uri, webview: vscode.Webview) {

        const folderPath = vscode.Uri.file(resolve(uri.fsPath, ".."));
        const files = readdirSync(folderPath.fsPath)
        let text = "";
        let current;
        let i = 0;
        const currentFile = basename(uri.fsPath)
        for (const file of files) {
            if (currentFile == file) {
                current = i;
            }
            if (file.match(/\.(jpg|png|svg|gif|apng|bmp|ico|cur|jpeg|pjpeg|pjp|tif|tiff|webp)$/i)) {
                i++;
                const resUri = vscode.Uri.file(folderPath.fsPath + "/" + file);
                const resource = webview.asWebviewUri(resUri).with({ query: `nonce=${Date.now().toString()}` }).toString();
                text += `<a href="${resource}" title="${file}"> <img src="${resource}" > </a>`
            }
        }



        webview.html =
            Util.buildPath(readFileSync(this.extensionPath + "/resource/lightgallery/lg.html", 'utf8'), webview, this.extensionPath + "/resource/lightgallery")
                .replace("{{content}}", text).replace("{{current}}", current);
    }


    private handlePdf(uri: vscode.Uri, webview: vscode.Webview) {
        webview.html = Util.buildPath(
            readFileSync(this.extensionPath + "/resource/pdf/viewer.html", 'utf8').replace("{{content}}",
                JSON.stringify({
                    path: webview.asWebviewUri(uri).with({ query: `nonce=${Date.now().toString()}` }).toString(),
                    defaults: {
                        cursor: "select",
                        scale: "auto",
                        sidebar: true,
                        scrollMode: "vertical",
                        spreadMode: "none",
                    },
                }).replace(/"/g, '&quot;')
            ),
            webview, this.extensionPath + "/resource/pdf"
        );
    }

    private handleFont(document: vscode.CustomDocument, handler: Hanlder) {
        const webview = handler.panel.webview;
        handler.on("init", () => {
            handler.emit('open', { href: webview.asWebviewUri(document.uri).toString() })
        })
        webview.html =
            Util.buildPath(
                readFileSync(this.extensionPath + "/resource/font/ttf/index.html", 'utf8')
                , webview, this.extensionPath + "/resource/font/ttf"
            )
    }


    private handleXlsx(uri: vscode.Uri, handler: Hanlder) {
        var enc = new TextEncoder();
        handler.on("init", async () => {
            handler.emit("open", {
                path: handler.panel.webview.asWebviewUri(uri).with({ query: `nonce=${Date.now().toString()}` }).toString(),
                file: resolve(uri.fsPath), ext: extname(uri.fsPath)
            })
        }).on("save", async (content) => {
            await vscode.workspace.fs.writeFile(uri, new Uint8Array(content))
            handler.emit("saveDone")
        }).on("saveCsv", async (content) => {
            await vscode.workspace.fs.writeFile(uri, enc.encode(content))
            handler.emit("saveDone")
        })
        return "excel.html"
    }

}