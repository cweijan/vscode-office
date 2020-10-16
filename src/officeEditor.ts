import { S_IFIFO } from 'constants';
import { readdirSync, readFileSync } from 'fs';
import { basename, extname, resolve } from 'path';
import * as vscode from 'vscode';
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

        switch (ext) {
            case ".xlsx":
            case ".xls":
            case ".csv":
                htmlPath = this.handleXlsx(uri, webview)
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
            i++;
            if (file.match(/\.(jpg|png|svg|gif|apng|bmp|ico|cur|jpeg|pjpeg|pjp|tif|tiff|webp)$/i)) {
                const resUri = vscode.Uri.file(folderPath.fsPath + "/" + file);
                const resource = webview.asWebviewUri(resUri).toString();
                text += `<a href="${resource}" title="${file}"> <img src="${resource}" > </a>`
            }
        }
        webview.html =
            Util.buildPath(readFileSync(this.extensionPath + "/resource/lightgallery/lg.html", 'utf8'), webview, this.extensionPath + "/resource/lightgallery")
                .replace("{{content}}", text).replace("{{current}}",current);
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

    private handleXlsx(uri: vscode.Uri, webview: vscode.Webview) {
        webview.onDidReceiveMessage(async (message) => {
            if (message.type == "init") {
                const content = await vscode.workspace.fs.readFile(uri)
                webview.postMessage({ type: "open", content })
            }
        })
        return "index.html"
    }

}