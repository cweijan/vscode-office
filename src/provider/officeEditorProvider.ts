import * as fs from 'fs';
import { readFileSync } from 'fs';
import fetch from 'node-fetch';
import { basename, extname, resolve } from 'path';
import * as util from 'util';
import * as vscode from 'vscode';
import { MessageOptions } from 'vscode';
import { Hanlder } from '../common/handler';
import { Util } from '../common/util';
import { Holder } from '../service/markdown/holder';
import { MarkdownService } from '../service/markdownService';
const streamPipeline = util.promisify(require('stream').pipeline);

/**
 * support view and edit office files.
 */
export class OfficeEditorProvider implements vscode.CustomTextEditorProvider {

    private extensionPath: string;
    private countStatus: vscode.StatusBarItem;
    private cursorStatus: vscode.StatusBarItem;

    constructor(private context: vscode.ExtensionContext) {
        this.extensionPath = context.extensionPath;
        this.countStatus = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.cursorStatus = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 120);
    }

    private getFolders(): vscode.Uri[] {
        const data = [];
        for (var i = 65; i <= 90; i++) {
            data.push(vscode.Uri.file(`${String.fromCharCode(i)}:/`))
        }
        return data;
    }

    resolveCustomTextEditor(document: vscode.TextDocument, webviewPanel: vscode.WebviewPanel, token: vscode.CancellationToken): void | Thenable<void> {
        const uri = document.uri;
        const webview = webviewPanel.webview;
        const folderPath = vscode.Uri.file(resolve(uri.fsPath, ".."));
        webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.file("/"), ...this.getFolders()]
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

        const content = readFileSync(uri.fsPath, 'utf8');
        const type = vscode.workspace.getConfiguration("vscode-office").get<string>("markdownType");
        let path = "markdown-hyper";
        if (type == "vditor") {
            path = "vditor";
        }
        if (type == "auto") {
            path = "vditor";
            const length=content?.match(/\$/g)?.length;
            if(length && length>30){
                path = "markdown-hyper";
            }
        }

        Holder.activeUrl = uri;
        handler.panel.onDidChangeViewState(e => {
            Holder.activeUrl = e.webviewPanel.visible ? uri : null
            if(!e.webviewPanel.visible){
                this.countStatus.hide()
                this.cursorStatus.hide()
            }
        });

        handler.on("init", () => {
            handler.emit("open", {
                title: basename(uri.fsPath),
                content,
                folderPath: webview.asWebviewUri(folderPath).toString(),
                autoTheme: vscode.workspace.getConfiguration("vscode-office").get<boolean>("autoTheme"),
                viewAbsoluteLocal: vscode.workspace.getConfiguration("vscode-office").get<boolean>("viewAbsoluteLocal")
            })
            this.countStatus.text = `Line ${content.split(/\r\n|\r|\n/).length}    Count ${content.length}`
            this.countStatus.show()
        }).on("command", (command) => {
            vscode.commands.executeCommand(command)
        }).on("openLink", (uri) => {
            vscode.env.openExternal(vscode.Uri.parse(uri));
        }).on("cursorActivity", (cursor) => {
            this.cursorStatus.text = `Ln ${cursor.line}, Col ${cursor.ch}`
            this.cursorStatus.show()
        }).on("focus", ({ count, lineCount }) => {
            this.countStatus.text = `Line ${lineCount}    Count ${count}`
            this.countStatus.show()
        }).on("input", () => {
            const edit = new vscode.WorkspaceEdit();
            edit.replace(document.uri, new vscode.Range(document.lineCount, 0, document.lineCount, 0), "" + new Date().getTime());
            return vscode.workspace.applyEdit(edit);
        }).on("save", (content) => {
            this.updateTextDocument(document, content)
        }).on("codemirrorEdit", (content) => {
            this.updateTextDocumentByEdit(document, content)
        }).on("doSave", async (content) => {
            if (content) {
                await this.updateTextDocument(document, content)
                this.countStatus.text = `Line ${content.split(/\r\n|\r|\n/).length}    Count ${content.length}`
                this.countStatus.show()
            }
            vscode.commands.executeCommand('workbench.action.files.save');
        }).on("export", () => {
            vscode.commands.executeCommand('workbench.action.files.save');
            new MarkdownService(this.context).exportPdf(uri)
        }).on("exportPdfByHtml",()=>{
            vscode.commands.executeCommand('workbench.action.files.save');
            new MarkdownService(this.context).exportPdfByHtml(uri)
        }).on("dispose", () => {
            if (Holder.activeUrl == uri) {
                Holder.activeUrl = null;
            }
        })

        const contextPath = `${this.extensionPath}/resource/${path}`;
        webview.html = Util.buildPath(
            readFileSync(`${this.extensionPath}/resource/${path}/index.html`, 'utf8')
                .replace("{{rootPath}}", webview.asWebviewUri(vscode.Uri.file(`${contextPath}`)).toString() )
                .replace("{{baseUrl}}", webview.asWebviewUri(folderPath).toString()),
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