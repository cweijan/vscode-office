import { readFileSync } from 'fs';
import { extname, resolve } from 'path';
import * as vscode from 'vscode';
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
        const webview = webviewPanel.webview;

        webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.file(this.extensionPath), vscode.Uri.file(resolve(uri.fsPath, ".."))]
        }

        const ext = extname(uri.fsPath)
        let htmlPath: string | null = null;
        switch (ext) {
            case ".xlsx":
            case ".xls":
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
                webview.html = this.buildPath(
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
                    )
                    , webview, this.extensionPath + "/resource/pdf"

                );
                break;
            case ".xmind":
                webview.onDidReceiveMessage(async () => { webview.postMessage({ type: "open", content: readFileSync(uri.fsPath) }) });
                webview.html = this.buildPath(readFileSync(this.extensionPath + "/resource/xmind/index.html", 'utf8'), webview, this.extensionPath + "/resource");
                break;
            case ".epub":
                webview.onDidReceiveMessage(async () => webview.postMessage({ type: "open", content: webview.asWebviewUri(uri).toString() }))
                webview.html = this.buildPath(readFileSync(this.extensionPath + "/resource/epub/index.html", 'utf8'), webview, this.extensionPath + "/resource/epub");
                break;
            default:
                webview.html = "Unsupport now!"
        }

        if (htmlPath != null) {
            webview.html = this.buildPath(readFileSync(this.extensionPath + "/resource/" + htmlPath, 'utf8'), webview, this.extensionPath + "/resource")
        }

    }

    private handleSvg(uri: vscode.Uri, webview: vscode.Webview) {
        webview.html =
            this.buildPath(
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
                    this.buildPath(
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

    private buildPath(data: string, webview: vscode.Webview, contextPath: string): string {
        return data.replace(/((src|href)=("|'))(.+?\.(css|js|properties))\b/gi, "$1" + webview.asWebviewUri(vscode.Uri.file(`${contextPath}`)) + "/$4");
    }

}