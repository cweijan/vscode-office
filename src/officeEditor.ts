import { readFileSync } from 'fs';
import { basename, extname, resolve } from 'path';
import * as vscode from 'vscode';
import * as util from 'util';
import * as fs from 'fs';
const streamPipeline = util.promisify(require('stream').pipeline);
import fetch from 'node-fetch';
import { MessageOptions } from 'vscode';
import { Holder } from './holder';
import { MarkdownService } from './markdownService';
const mammoth = require("mammoth");

export class OfficeEditor implements vscode.CustomTextEditorProvider {

    private extensionPath: string;

    constructor(private context: vscode.ExtensionContext) {
        this.extensionPath = context.extensionPath;
    }

    public openCustomDocument(uri: vscode.Uri, openContext: vscode.CustomDocumentOpenContext, token: vscode.CancellationToken): vscode.CustomDocument | Thenable<vscode.CustomDocument> {
        return { uri, dispose: (): void => { } };
    }
    public resolveCustomTextEditor(document: vscode.TextDocument, webviewPanel: vscode.WebviewPanel, token: vscode.CancellationToken): void | Thenable<void> {
        const uri = document.uri;
        const webview = webviewPanel.webview;
        const folderPath = vscode.Uri.file(resolve(uri.fsPath, ".."));
        webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.file(this.extensionPath), folderPath]
        }

        const ext = extname(uri.fsPath)
        let htmlPath: string | null = null;
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
                webview.html = this.buildPath(readFileSync(this.extensionPath + "/resource/xmind/index.html", 'utf8'), webview, this.extensionPath + "/resource");
                break;
            case ".puml":
            case ".plantuml":
            case ".pu":
                this.handlePuml(uri, webview);
                break;
            case ".md":
                this.handleMarkdown(webviewPanel, document, uri, webview, folderPath);
                break;
            case ".epub":
                webview.onDidReceiveMessage(async () => webview.postMessage({ type: "open", content: webview.asWebviewUri(uri).toString() }))
                webview.html = this.buildPath(readFileSync(this.extensionPath + "/resource/epub/index.html", 'utf8'), webview, this.extensionPath + "/resource/epub");
                break;
            default:
                vscode.commands.executeCommand('vscode.openWith', uri, "default");
        }

        if (htmlPath != null) {
            webview.html = this.buildPath(readFileSync(this.extensionPath + "/resource/" + htmlPath, 'utf8'), webview, this.extensionPath + "/resource")
        }

    }

    private handleMarkdown(webviewPanel: vscode.WebviewPanel, document: vscode.TextDocument, uri: vscode.Uri, webview: vscode.Webview, folderPath: vscode.Uri) {
        const type = vscode.workspace.getConfiguration("vscode-office").get<string>("markdownType");
        if (type == "default") {
            vscode.commands.executeCommand('vscode.openWith', uri, "default");
            return;
        }
        webviewPanel.onDidChangeViewState(e => Holder.activeUrl = e.webviewPanel.visible ? uri : null);
        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() === uri.toString()) {
                webview.postMessage({
                    type: "update", content: readFileSync(uri.fsPath, 'utf8')
                });
            }
        });
        webviewPanel.onDidDispose(() => {
            changeDocumentSubscription.dispose()
            if (Holder.activeUrl == uri) {
                Holder.activeUrl = null;
            }
        });
        webview.onDidReceiveMessage(async (message) => {
            switch (message.type) {
                case 'init':
                    Holder.activeUrl = uri;
                    webview.postMessage({
                        type: "open", content: {
                            title: basename(uri.fsPath),
                            content: readFileSync(uri.fsPath, 'utf8'),
                            folderPath: webview.asWebviewUri(folderPath).toString()
                        }
                    });
                    break;
                case 'save':
                    this.updateTextDocument(document, message.content)
                    break;
                case 'doSave':
                    vscode.commands.executeCommand('workbench.action.files.save');
                    break;
                case 'edit':
                    vscode.commands.executeCommand('vscode.openWith', uri, "default");
                    break;
                case 'export':
                    new MarkdownService(this.context).exportPdf(uri)
                    break;
            }
        });
        webview.html =
            this.buildPath(
                readFileSync(this.extensionPath + "/resource/markdown/index.html", 'utf8'),
                webview, this.extensionPath + "/resource/markdown");
    }

    private handlePdf(uri: vscode.Uri, webview: vscode.Webview) {
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
            ),
            webview, this.extensionPath + "/resource/pdf"
        );
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
        return data.replace(/((src|href)=("|'))(.+?\.(css|js|properties|json))\b/gi, "$1" + webview.asWebviewUri(vscode.Uri.file(`${contextPath}`)) + "/$4");
    }


    /**
     * Write out the json to a given document.
     */
    private updateTextDocument(document: vscode.TextDocument, json: any) {
        const edit = new vscode.WorkspaceEdit();
        edit.replace( document.uri, new vscode.Range(0, 0, document.lineCount, 0), json);
        return vscode.workspace.applyEdit(edit);
    }

    private handlePuml(uri: vscode.Uri, webview: vscode.Webview) {
        webview.onDidReceiveMessage(async (message) => {
            switch (message.type) {
                case 'init':
                    webview.postMessage({ type: "open", content: readFileSync(uri.fsPath, 'utf8') });
                    break;
                case 'edit':
                    vscode.commands.executeCommand('vscode.openWith', uri, "default");
                    break;
                case 'download':
                    vscode.window.showSaveDialog({ title: "Select download path" }).then((downloadPath) => {
                        if (downloadPath) {
                            (async () => {
                                vscode.window.showInformationMessage("Start downloading...", { model: true } as MessageOptions)
                                const response = await fetch(message.content);
                                if (response.ok) {
                                    vscode.window.showInformationMessage("Download success!")
                                    return streamPipeline(response.body, fs.createWriteStream(downloadPath.fsPath));
                                }
                                vscode.window.showErrorMessage(`unexpected response ${response.statusText}`)
                            })();
                        }
                    });
                    break;
            }
        });
        webview.html = this.buildPath(readFileSync(this.extensionPath + "/resource/plantuml/index.html", 'utf8'), webview, this.extensionPath + "/resource/plantuml");
    }


}