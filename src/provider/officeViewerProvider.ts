import { ReactApp } from '@/common/reactApp';
import { spawn } from 'child_process';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { extname, parse } from 'path';
import { TextEncoder } from 'util';
import * as vscode from 'vscode';
import { Output } from '../common/Output';
import { Handler } from '../common/handler';
import { Util } from '../common/util';
import { handleImage, isImage } from './handlers/imageHanlder';
import { handleZip } from './handlers/zipHandler';

/**
 * support view office files
 */
export class OfficeViewerProvider implements vscode.CustomReadonlyEditorProvider {

    private extensionPath: string;

    constructor(private context: vscode.ExtensionContext) {
        this.extensionPath = context.extensionPath;
    }

    bindCustomEditors(viewOption: { webviewOptions: vscode.WebviewPanelOptions }) {
        const viewers = ['cweijan.officeViewer', 'cweijan.imageViewer', 'cweijan.htmlViewer', 'cweijan.classViewer']
        return viewers.map(viewer => vscode.window.registerCustomEditorProvider(viewer, this, viewOption))
    }

    public openCustomDocument(uri: vscode.Uri, openContext: vscode.CustomDocumentOpenContext, token: vscode.CancellationToken): vscode.CustomDocument | Thenable<vscode.CustomDocument> {
        return { uri, dispose: (): void => { } };
    }
    public resolveCustomEditor(document: vscode.CustomDocument, webviewPanel: vscode.WebviewPanel, token: vscode.CancellationToken): void | Thenable<void> {
        const uri = document.uri;
        const webview = webviewPanel.webview;
        const folderPath = vscode.Uri.joinPath(uri, '..')
        webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.file(this.extensionPath), folderPath]
        }

        const ext = extname(uri.fsPath).toLowerCase()
        let htmlPath: string | null = null;


        const send = () => {
            handler.emit("open", {
                ext: extname(uri.fsPath),
                path: handler.panel.webview.asWebviewUri(uri).with({ query: `nonce=${Date.now().toString()}` }).toString(),
            })
        }

        let route: string;
        const handler = Handler.bind(webviewPanel, uri);
        handler
            .on("editInVSCode", (full: boolean) => {
                const side = full ? vscode.ViewColumn.Active : vscode.ViewColumn.Beside;
                vscode.commands.executeCommand('vscode.openWith', uri, "default", side);
            })
            .on('developerTool', () => vscode.commands.executeCommand('workbench.action.toggleDevTools'))
            .on("init", send)

        if (isImage(ext)) {
            handleImage(handler, uri, webview)
            return ReactApp.view(webview, { route: 'image' })
        }

        switch (ext) {
            case ".xlsx":
            case ".xlsm":
            case ".xls":
            case ".csv":
            case ".ods":
                route = 'excel';
                handler.on("fileChange", send)
                break;
            case ".docx":
            case ".dotx":
                route = 'word'
                handler.on("fileChange", send)
                break;
            case ".jar":
            case ".zip":
            case ".apk":
            case ".vsix":
                route = 'zip';
                handleZip(uri, handler);
                break;
            case ".pdf":
                this.handlePdf(webview);
                handler.on("fileChange", send)
                break;
            case ".ttf":
            case ".woff":
            case ".woff2":
            case ".otf":
                this.handleFont(handler)
                break;
            case ".class":
                this.handleClass(uri, webviewPanel);
                break;
            case ".htm":
            case ".html":
                webview.html = Util.buildPath(readFileSync(uri.fsPath, 'utf8'), webview, folderPath.fsPath);
                Util.listen(webviewPanel, uri, () => {
                    webviewPanel.webview.html = Util.buildPath(readFileSync(uri.fsPath, 'utf8'), webviewPanel.webview, folderPath.fsPath);
                })
                break;
            default:
                vscode.commands.executeCommand('vscode.openWith', uri, "default");
        }
        if (route) return ReactApp.view(webview, { route })

        if (htmlPath != null) {
            webview.html = Util.buildPath(readFileSync(this.extensionPath + "/resource/" + htmlPath, 'utf8'), webview, this.extensionPath + "/resource")
        }

    }

    private handlePdf(webview: vscode.Webview) {
        const baseUrl = this.getBaseUrl(webview, 'pdf')
        webview.html = readFileSync(this.extensionPath + "/resource/pdf/viewer.html", 'utf8').replace("{{baseUrl}}", baseUrl)
    }

    private handleFont(handler: Handler) {
        const webview = handler.panel.webview;
        const baseUrl = this.getBaseUrl(webview, 'font')
        webview.html = readFileSync(`${this.extensionPath}/resource/font/index.html`, 'utf8')
            .replace('{{baseUrl}}', baseUrl)
    }

    private getBaseUrl(webview: vscode.Webview, path: string) {
        const baseUrl = webview.asWebviewUri(vscode.Uri.file(`${this.extensionPath}/resource/${path}`))
            .toString().replace(/\?.+$/, '').replace('https://git', 'https://file')
        return baseUrl;
    }

    private async handleClass(uri: vscode.Uri, panel: vscode.WebviewPanel) {
        if (uri.scheme != "file") {
            vscode.commands.executeCommand('vscode.openWith', uri, "default");
            return;
        }

        const tempPath = `${tmpdir()}/office_temp_java`
        if (!existsSync(tempPath)) {
            mkdirSync(tempPath)
        }

        const java = spawn("java", ['-cp', '../resource/java-decompiler.jar', 'org.jetbrains.java.decompiler.main.decompiler.ConsoleDecompiler', uri.fsPath, tempPath], { cwd: __dirname })
        java.stdout.on('data', (data) => {
            console.log(data.toString("utf8"))
            if (data.toString("utf8").indexOf("done") == -1) {
                return;
            }
            const fileName = `${tempPath}/${parse(uri.fsPath).name}.java`;
            setTimeout(() => {
                vscode.window.showTextDocument(vscode.Uri.file(fileName).with({ scheme: "decompile_java", query: new Date().getTime().toString() }));
            }, 10);
        });

        java.stderr.on('data', (data) => {
            Output.log(data.toString("utf8"))
        });

    }

}