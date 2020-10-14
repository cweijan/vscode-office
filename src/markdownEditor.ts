import * as fs from 'fs';
import { readFileSync } from 'fs';
import fetch from 'node-fetch';
import { basename, extname, resolve } from 'path';
import * as util from 'util';
import * as vscode from 'vscode';
import { MessageOptions } from 'vscode';
import { Hanlder } from './common/handler';
import { Util } from './common/util';
import { Holder } from './holder';
import { MarkdownService } from './markdownService';
const streamPipeline = util.promisify(require('stream').pipeline);

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

        const ext = extname(uri.fsPath).toLowerCase()
        const handler = Hanlder.bind(webviewPanel, uri);
        switch (ext) {
            case ".puml":
            case ".plantuml":
            case ".pu":
                this.handlePuml(document, handler);
                break;
            case ".md":
                this.handleMarkdown(document, handler, folderPath)
                break;
        }

    }

    private handlePuml(document: vscode.TextDocument, handler: Hanlder) {
        const uri = document.uri;


        handler.on("init", () => {
            handler.emit("open", readFileSync(uri.fsPath, 'utf8'))
        }).on("save", (content) => {
            this.updateTextDocument(document, content)
        }).on("edit", () => {
            vscode.commands.executeCommand('vscode.openWith', uri, "default");
        }).on("doSave", () => {
            vscode.commands.executeCommand('workbench.action.files.save');
        }).on("codemirrorEdit", (content) => {
            this.updateTextDocumentByEdit(document, content)
        }).on("download", (content) => {
            vscode.window.showSaveDialog({ title: "Select download path" }).then((downloadPath) => {
                if (downloadPath) {
                    (async () => {
                        vscode.window.showInformationMessage("Start downloading...", { model: true } as MessageOptions)
                        const response = await fetch(content);
                        if (response.ok) {
                            vscode.window.showInformationMessage("Download success!")
                            return streamPipeline(response.body, fs.createWriteStream(downloadPath.fsPath));
                        }
                        vscode.window.showErrorMessage(`unexpected response ${response.statusText}`)
                    })();
                }
            });
        })
        const webview = handler.panel.webview;
        webview.html = Util.buildPath(readFileSync(this.extensionPath + "/resource/plantuml/index.html", 'utf8'), webview, this.extensionPath + "/resource/plantuml");
    }

    private handleMarkdown(document: vscode.TextDocument, handler: Hanlder, folderPath: vscode.Uri) {

        const uri = document.uri;
        const webview = handler.panel.webview;

        const type = vscode.workspace.getConfiguration("vscode-office").get<string>("markdownType");
        let path = "markdown-hyper";
        if (type == "stackedit") {
            path = "markdown";
        }

        handler.on("init", () => {
            handler.emit("open", {
                title: basename(uri.fsPath),
                content: readFileSync(uri.fsPath, 'utf8'),
                folderPath: webview.asWebviewUri(folderPath).toString()
            })
        }).on("save", (content) => {
            this.updateTextDocument(document, content)
        }).on("codemirrorEdit", (content) => {
            this.updateTextDocumentByEdit(document, content)
        }).on("doSave", () => {
            vscode.commands.executeCommand('workbench.action.files.save');
        }).on("edit", () => {
            vscode.commands.executeCommand('vscode.openWith', uri, "default");
        }).on("export", () => {
            vscode.commands.executeCommand('workbench.action.files.save');
            new MarkdownService(this.context).exportPdf(uri)
        }).on("dispose", () => {
            if (Holder.activeUrl == uri) {
                Holder.activeUrl = null;
            }
        })


        const contextPath = `${this.extensionPath}/resource/${path}`;
        webview.html = Util.buildPath(
            readFileSync(`${this.extensionPath}/resource/${path}/index.html`, 'utf8')
                .replace("{{rootPath}}", webview.asWebviewUri(vscode.Uri.file(`${contextPath}`)).toString()
                ),
            webview, contextPath);
    }

    private updateTextDocument(document: vscode.TextDocument, content: any) {
        const edit = new vscode.WorkspaceEdit();
        edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), content);
        return vscode.workspace.applyEdit(edit);
    }

    private updateTextDocumentByEdit(document: vscode.TextDocument, changed: any) {
        const edit = new vscode.WorkspaceEdit();
        edit.replace(document.uri, new vscode.Range(changed.from.line, changed.from.ch, changed.to.line, changed.to.ch), changed.text.join('\n'));
        return vscode.workspace.applyEdit(edit);
    }

}