import { readFileSync } from 'fs';
import * as vscode from 'vscode';
import { basename, extname, resolve } from 'path';
import { Holder } from './holder';
import { MarkdownService } from './markdownService';

export class MarkdownEditor implements vscode.CustomTextEditorProvider {

    private extensionPath: string;

    constructor(private context: vscode.ExtensionContext) {
        this.extensionPath = context.extensionPath;
    }

    resolveCustomTextEditor(document: vscode.TextDocument, webviewPanel: vscode.WebviewPanel, token: vscode.CancellationToken): void | Thenable<void> {
        const uri = document.uri;
        const webview = webviewPanel.webview;
        const folderPath = vscode.Uri.file(resolve(uri.fsPath, ".."));
        webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.file(this.extensionPath), folderPath]
        }
        this.handleMarkdown(webviewPanel, document, uri, webview, folderPath)
    }

    private handleMarkdown(webviewPanel: vscode.WebviewPanel, document: vscode.TextDocument, uri: vscode.Uri, webview: vscode.Webview, folderPath: vscode.Uri) {
        const type = vscode.workspace.getConfiguration("vscode-office").get<string>("markdownType");
        let path = "markdown-hyper";
        if (type == "stackedit") {
            path = "markdown";
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

        const contextPath = `${this.extensionPath}/resource/${path}`;
        webview.html =
            this.buildPath(
                readFileSync(`${this.extensionPath}/resource/${path}/index.html`, 'utf8')
                    .replace("{{rootPath}}", webview.asWebviewUri(vscode.Uri.file(`${contextPath}`)).toString()
                    ),
                webview, contextPath);
    }

    private buildPath(data: string, webview: vscode.Webview, contextPath: string): string {
        return data.replace(/((src|href)=("|'))(.+?\.(css|js|properties|json|svg))\b/gi, "$1" + webview.asWebviewUri(vscode.Uri.file(`${contextPath}`)) + "/$4");
    }


    /**
     * Write out the json to a given document.
     */
    private updateTextDocument(document: vscode.TextDocument, json: any) {
        const edit = new vscode.WorkspaceEdit();
        edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), json);
        return vscode.workspace.applyEdit(edit);
    }

}