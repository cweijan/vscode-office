import { S_IFIFO } from 'constants';
import { fstat, readdirSync, readFileSync } from 'fs';
import { basename, extname, resolve } from 'path';
import { TextEncoder } from 'util';
import * as vscode from 'vscode';
import { Hanlder } from './common/handler';
import { Util } from './common/util';
const mammoth = require("mammoth");

export class OfficeEditor implements vscode.CustomReadonlyEditorProvider {

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
        const folderPath = vscode.Uri.file(resolve(uri.fsPath, ".."));
        webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.file(this.extensionPath), folderPath]
        }

        const ext = extname(uri.fsPath).toLowerCase()
        let htmlPath: string | null = null;

        if (ext.match(/\.(jpg|png|svg|gif|apng|bmp|ico|cur|jpeg|pjpeg|pjp|tif|tiff|webp)$/i)) {
            this.handleImage(uri, webview)
            return;
        }


        const handler = Hanlder.bind(webviewPanel, uri);

        switch (ext) {
            case ".xlsx":
            case ".xls":
            case ".csv":
                htmlPath = this.handleXlsx(uri, handler)
                break;
            case ".ttf":
            case ".woff":
            case ".otf":
                this.handleFont(document, handler)
                break;
            case ".psd":
                webview.onDidReceiveMessage(() => webview.postMessage({ type: "open", content: webview.asWebviewUri(uri).toString() }))
                htmlPath = "psd.html"
                break;
            case ".docx":
                this.handleDocx(uri, webview)
                break;
            case ".svg":
                this.handleSvg(uri, webview);
                break;
            case ".pdf":
                this.handlePdf(uri, webview);
                break;
            case ".xmind":
                webview.onDidReceiveMessage(async () => { webview.postMessage({ type: "open", content: readFileSync(uri.fsPath) }) });
                webview.html = Util.buildPath(readFileSync(this.extensionPath + "/resource/xmind/index.html", 'utf8'), webview, this.extensionPath + "/resource");
                break;
            case ".htm":
            case ".html":
                webview.html = Util.buildPath(readFileSync(uri.fsPath, 'utf8'), webview, folderPath.fsPath);
                Util.listen(webviewPanel, uri, () => {
                    webviewPanel.webview.html = Util.buildPath(readFileSync(uri.fsPath, 'utf8'), webviewPanel.webview, folderPath.fsPath);
                })
                break;
            case ".epub":
                webview.onDidReceiveMessage(async () => webview.postMessage({ type: "open", content: webview.asWebviewUri(uri).toString() }))
                webview.html = Util.buildPath(readFileSync(this.extensionPath + "/resource/epub/index.html", 'utf8'), webview, this.extensionPath + "/resource/epub");
                break;
            default:
                vscode.commands.executeCommand('vscode.openWith', uri, "default");
        }

        if (htmlPath != null) {
            webview.html = Util.buildPath(readFileSync(this.extensionPath + "/resource/" + htmlPath, 'utf8'), webview, this.extensionPath + "/resource")
        }

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
                const resource = webview.asWebviewUri(resUri).toString();
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
                    path: webview.asWebviewUri(uri).toString(),
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

    private handleSvg(uri: vscode.Uri, webview: vscode.Webview) {
        webview.html =
            Util.buildPath(
                readFileSync(this.extensionPath + "/resource/svg/svg.html", 'utf8')
                    .replace("{{content}}",
                        encodeURIComponent(readFileSync(uri.fsPath, 'utf8'))
                    ),
                webview, this.extensionPath + "/resource"
            );
    }

    private handleDocx(uri: vscode.Uri, webview: vscode.Webview) {
        mammoth.convertToHtml({ path: uri.fsPath })
            .then((result: any) => {
                console.debug(result.messages)
                webview.html =
                    Util.buildPath(
                        readFileSync(this.extensionPath + "/resource/word.html", 'utf8').replace("{{content}}", result.value)
                        , webview, this.extensionPath + "/resource"
                    )
            })
            .done();
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
            const content = await vscode.workspace.fs.readFile(uri)
            handler.emit("open", { content, file: resolve(uri.fsPath) })
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