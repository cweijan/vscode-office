import * as fs from 'fs';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import fetch from 'node-fetch';
import { basename, dirname, extname, isAbsolute, parse, resolve } from 'path';
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
    private state: vscode.Memento;

    constructor(private context: vscode.ExtensionContext) {
        this.extensionPath = context.extensionPath;
        this.countStatus = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.state = context.globalState
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
        const folderPath = vscode.Uri.joinPath(uri, '..')
        webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.file("/"), ...this.getFolders()]
        }
        const ext = extname(uri.fsPath).toLowerCase()
        const handler = Hanlder.bind(webviewPanel, uri);
        switch (ext) {
            case ".md":
                this.handleMarkdown(document, handler, folderPath)
                break;
            case ".puml":
            case ".plantuml":
            case ".pu":
                this.handlePuml(document, handler);
                break;
        }
    }

    private handleMarkdown(document: vscode.TextDocument, handler: Hanlder, folderPath: vscode.Uri) {

        const uri = document.uri;
        const webview = handler.panel.webview;

        let content = document.getText();
        const contextPath = `${this.extensionPath}/resource/vditor`;
        const rootPath = webview.asWebviewUri(vscode.Uri.file(`${contextPath}`)).toString();

        Holder.activeDocument = document;
        handler.panel.onDidChangeViewState(e => {
            Holder.activeDocument = e.webviewPanel.visible ? document : Holder.activeDocument
            if (e.webviewPanel.visible) {
                this.updateCount(content)
                this.countStatus.show()
            } else {
                this.countStatus.hide()
            }
        });

        const config = vscode.workspace.getConfiguration("vscode-office");
        handler.on("init", () => {
            const scrollTop = this.state.get(`scrollTop_${document.uri.fsPath}`, 0);
            handler.emit("open", {
                title: basename(uri.fsPath),
                content, rootPath, config,
                scrollTop
            })
            this.updateCount(content)
            this.countStatus.show()
        }).on("externalUpdate", e => {
            const updatedText = e.document.getText()?.replace(/\r/g, '');
            if (content == updatedText) return;
            content = updatedText;
            this.updateCount(content)
            handler.emit("update", updatedText)
        }).on("command", (command) => {
            vscode.commands.executeCommand(command)
        }).on("openLink", (uri: string) => {
            const resReg = /https:\/\/file.*\.net/i;
            if (uri.match(resReg)) {
                const localPath = uri.replace(resReg, '')
                vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(localPath));
            } else {
                vscode.env.openExternal(vscode.Uri.parse(uri));
            }
        }).on("scroll", ({ scrollTop }) => {
            this.state.update(`scrollTop_${document.uri.fsPath}`, scrollTop)
        }).on("img", (img) => {
            let rePath = vscode.workspace.getConfiguration("vscode-office").get<string>("pasterImgPath");
            rePath = rePath.replace("${fileName}", parse(uri.fsPath).name.replace(/\s/g, '')).replace("${now}", new Date().getTime() + "")
            const imagePath = isAbsolute(rePath) ? rePath : `${resolve(uri.fsPath, "..")}/${rePath}`.replace(/\\/g, "/");
            const dir = dirname(imagePath)
            if (!existsSync(dir)) {
                mkdirSync(dir, { recursive: true })
            }
            const fileName = parse(rePath).name;
            fs.writeFileSync(imagePath, Buffer.from(img, 'binary'))
            console.log(img)
            vscode.env.clipboard.writeText(`![${fileName}](${rePath})`)
            vscode.commands.executeCommand("editor.action.clipboardPasteAction")
        }).on("editInVSCode", () => {
            vscode.commands.executeCommand('vscode.openWith', uri, "default", vscode.ViewColumn.Beside);
        }).on("save", (newContent) => {
            content = newContent
            this.updateTextDocument(document, newContent)
            this.updateCount(content)
        }).on("doSave", async (content) => {
            vscode.commands.executeCommand('workbench.action.files.save');
            this.updateCount(content)
        }).on("export", () => {
            vscode.commands.executeCommand('workbench.action.files.save');
            new MarkdownService(this.context).exportPdf(uri)
        }).on("exportPdfToHtml", () => {
            vscode.commands.executeCommand('workbench.action.files.save');
            new MarkdownService(this.context).exportPdfToHtml(uri)
        }).on("theme", () => {
            vscode.commands.executeCommand('workbench.action.selectTheme');
        }).on("saveOutline", (enable) => {
            config.update("openOutline", enable, true)
        })

        const baseUrl = webview.asWebviewUri(folderPath).toString().replace(/\?.+$/, '').replace('https://git', 'https://file');
        webview.html = Util.buildPath(
            readFileSync(`${this.extensionPath}/resource/vditor/index.html`, 'utf8')
                .replace("{{rootPath}}", rootPath)
                .replace("{{baseUrl}}", baseUrl),
            webview, contextPath);
    }

    private updateCount(content: string) {
        this.countStatus.text = `Line ${content.split(/\r\n|\r|\n/).length}    Count ${content.length}`
    }

    private handlePuml(document: vscode.TextDocument, handler: Hanlder) {
        const uri = document.uri;


        handler.on("init", () => {
            handler.emit("open", document.getText())
        }).on("externalUpdate", e => {
            const updatedText = e.document.getText();
            handler.emit("open", updatedText)
        }).on("save", async (content) => {
            await this.updateTextDocument(document, content)
            vscode.commands.executeCommand('workbench.action.files.save');
        }).on("edit", () => {
            vscode.commands.executeCommand('vscode.openWith', uri, "default", vscode.ViewColumn.Beside);
        }).on("doSave", () => {
            vscode.commands.executeCommand('workbench.action.files.save');
        }).on("download", (content) => {
            vscode.window.showSaveDialog({ title: "Select download path", defaultUri: vscode.Uri.file(document.fileName.replace(/puml/i, "svg")), filters: { 'Images': ['svg', 'png'] } }).then((downloadPath) => {
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

    private updateTextDocument(document: vscode.TextDocument, content: any) {
        const edit = new vscode.WorkspaceEdit();
        edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), content);
        return vscode.workspace.applyEdit(edit);
    }

}