import { adjustImgPath, getWorkspacePath, writeFile } from '@/common/fileUtil';
import { readFileSync, writeFileSync } from 'fs';
import { basename, isAbsolute, parse, resolve } from 'path';
import * as vscode from 'vscode';
import { Handler } from '../common/handler';
import { Util } from '../common/util';
import { Holder } from '../service/markdown/holder';
import { MarkdownService } from '../service/markdownService';
import { Global } from '@/common/global';
import { platform } from 'os';
import { preprocessQmd, isQmdFile } from '../service/qmdPreprocessor';

/**
 * support view and edit office files.
 */
export class MarkdownEditorProvider implements vscode.CustomTextEditorProvider {

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
        for (let i = 65; i <= 90; i++) {
            data.push(vscode.Uri.file(`${String.fromCharCode(i)}:/`))
        }
        return data;
    }

    resolveCustomTextEditor(document: vscode.TextDocument, webviewPanel: vscode.WebviewPanel, token: vscode.CancellationToken): void | Thenable<void> {
        // console.log('schema', document.uri.scheme);
        const uri = document.uri;
        const webview = webviewPanel.webview;
        const folderPath = vscode.Uri.joinPath(uri, '..')
        webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.file("/"), ...this.getFolders()]
        }
        const handler = Handler.bind(webviewPanel, uri);
        this.handleMarkdown(document, handler, folderPath)
        handler.on('developerTool', () => vscode.commands.executeCommand('workbench.action.toggleDevTools'))
    }

    private handleMarkdown(document: vscode.TextDocument, handler: Handler, folderPath: vscode.Uri) {

        const uri = document.uri;
        const webview = handler.panel.webview;

        let content = document.getText();

        // Preprocess QMD files for preview
        const isQmd = isQmdFile(uri.fsPath);
        let previewContent = isQmd ? preprocessQmd(content) : content;

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

        let lastManualSaveTime: number;
        const config = vscode.workspace.getConfiguration("vscode-office");
        handler.on("init", () => {
            const scrollTop = this.state.get(`scrollTop_${document.uri.fsPath}`, 0);
            handler.emit("open", {
                title: basename(uri.fsPath),
                config, scrollTop,
                language: vscode.env.language,
                rootPath, content: previewContent
            })
            this.updateCount(content)
            this.countStatus.show()
        }).on("externalUpdate", e => {
            if (lastManualSaveTime && Date.now() - lastManualSaveTime < 800) return;
            const updatedText = e.document.getText()?.replace(/\r/g, '');
            if (content == updatedText) return;
            content = updatedText;
            previewContent = isQmd ? preprocessQmd(content) : content;
            this.updateCount(content)
            handler.emit("update", previewContent)
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
        }).on("img", async (img) => {
            const { relPath, fullPath } = adjustImgPath(uri)
            const imagePath = isAbsolute(fullPath) ? fullPath : `${resolve(uri.fsPath, "..")}/${relPath}`.replace(/\\/g, "/");
            writeFileSync(imagePath, Buffer.from(img, 'binary'))
            const fileName = parse(relPath).name;
            const adjustRelPath = await MarkdownService.imgExtGuide(imagePath, relPath);
            vscode.env.clipboard.writeText(`![${fileName}](${adjustRelPath})`)
            vscode.commands.executeCommand("editor.action.clipboardPasteAction")
        }).on("quickOpen", () => {
            vscode.commands.executeCommand('workbench.action.quickOpen');
        }).on("editInVSCode", (full: boolean) => {
            const side = full ? vscode.ViewColumn.Active : vscode.ViewColumn.Beside;
            vscode.commands.executeCommand('vscode.openWith', uri, "default", side);
        }).on("save", (newContent) => {
            if (lastManualSaveTime && Date.now() - lastManualSaveTime < 800) return;
            content = newContent
            this.updateTextDocument(document, newContent)
            this.updateCount(content)
        }).on("doSave", async (content) => {
            lastManualSaveTime = Date.now();
            await this.updateTextDocument(document, content)
            this.updateCount(content)
            vscode.commands.executeCommand('workbench.action.files.save');
        }).on("export", (option) => {
            vscode.commands.executeCommand('workbench.action.files.save');
            new MarkdownService(this.context).exportMarkdown(uri, option)
        }).on("theme", async (theme) => {
            if (!theme) {
                const themes = [
                    "Auto", "|",
                    "Light", "Solarized", "Warm Light", "Dim Light", "|",
                    "One Dark", "Github Dark",
                    "Nord", "Monokai", "Dracula",
                ];
                const editorTheme = Global.getConfig('editorTheme');
                const themeItems: vscode.QuickPickItem[] = themes.map(theme => {
                    if (theme == '|') return { label: '|', kind: vscode.QuickPickItemKind.Separator }
                    return { label: theme, description: theme == editorTheme ? 'Current' : undefined }
                })
                theme = await vscode.window.showQuickPick(themeItems, { placeHolder: "Select Editor Theme" });
                if (!theme) return
            }
            handler.emit('theme', theme.label)
            Global.updateConfig('editorTheme', theme.label)
        }).on("saveOutline", (enable) => {
            config.update("openOutline", enable, true)
        }).on('developerTool', () => {
            vscode.commands.executeCommand('workbench.action.toggleDevTools')
        })

        const basePath = Global.getConfig('workspacePathAsImageBasePath') ?
            vscode.Uri.file(getWorkspacePath(folderPath)) : folderPath;
        const baseUrl = webview.asWebviewUri(basePath).toString().replace(/\?.+$/, '').replace('https://git', 'https://file');
        webview.html = Util.buildPath(
            readFileSync(`${this.extensionPath}/resource/vditor/index.html`, 'utf8')
                .replace("{{rootPath}}", rootPath)
                .replace("{{baseUrl}}", baseUrl)
                .replace(`{{configs}}`, JSON.stringify({
                    platform: platform()
                })),
            webview, contextPath);
    }

    private updateCount(content: string) {
        this.countStatus.text = `Line ${content.split(/\r\n|\r|\n/).length}    Count ${content.length}`
    }

    private updateTextDocument(document: vscode.TextDocument, content: any) {
        const edit = new vscode.WorkspaceEdit();
        edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), content);
        return vscode.workspace.applyEdit(edit);
    }

}