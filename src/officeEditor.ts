import * as vscode from 'vscode';
import { readFileSync } from 'fs';
import { extname } from 'path';
const mammoth = require("mammoth");

export class OfficeEditor implements vscode.CustomReadonlyEditorProvider {

    private extensionPath: string;

    constructor(context: vscode.ExtensionContext) {
        this.extensionPath = context.extensionPath;
    }

    public openCustomDocument(uri: vscode.Uri, openContext: vscode.CustomDocumentOpenContext, token: vscode.CancellationToken): vscode.CustomDocument | Thenable<vscode.CustomDocument> {
        return { uri, dispose: (): void => { } };
    }
    public resolveCustomEditor(document: vscode.CustomDocument, webviewPanel: vscode.WebviewPanel, token: vscode.CancellationToken): void | Thenable<void> {
        const uri = document.uri;

        webviewPanel.webview.options = {
            enableScripts: true
        }

        const ext = extname(uri.fsPath)
        switch (ext) {
            case ".xlsx":
            case ".xls":
                this.handleXlsx(uri, webviewPanel.webview)
                break;
            case ".docx":
                this.handleDocx(uri, webviewPanel.webview)
                break;
            default:
                webviewPanel.webview.html = "Unsupport now!"
        }


    }

    private handleDocx(uri: vscode.Uri, webview: vscode.Webview) {
        mammoth.convertToHtml({ path: uri.fsPath })
            .then((result: any) => {
                var html = result.value;
                var messages = result.messages; // Any messages, such as warnings during conversion
                console.debug(messages)
                webview.html = 
                this.buildPath(
                    readFileSync(this.extensionPath + "/resource/word.html", 'utf8').replace("{{content}}",html)
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

        webview.html = this.buildPath(readFileSync(this.extensionPath + "/resource/index.html", 'utf8'),
            webview, this.extensionPath + "/resource")
    }

    private buildPath(data: string, webview: vscode.Webview, contextPath: string): string {
        return data.replace(/((src|href)=("|'))(.+?\.(css|js))\b/gi, "$1" + webview.asWebviewUri(vscode.Uri.file(`${contextPath}`)) + "/$4");
    }

}