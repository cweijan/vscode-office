import { ReactApp } from '@/common/reactApp';
import { readFileSync } from 'fs';
import { extname } from 'path';
import * as vscode from 'vscode';
import { Handler } from '../common/handler';
import { Util } from '../common/util';
import { handleClass } from './handlers/classHandler';
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

        const send = () => {
            handler.emit("open", {
                ext: extname(uri.fsPath),
                path: handler.panel.webview.asWebviewUri(uri).with({ query: `nonce=${Date.now().toString()}` }).toString(),
            })
        }

        const handler = Handler.bind(webviewPanel, uri)
            .on("editInVSCode", (full: boolean) => {
                const side = full ? vscode.ViewColumn.Active : vscode.ViewColumn.Beside;
                vscode.commands.executeCommand('vscode.openWith', uri, "default", side);
            })
            .on('developerTool', () => vscode.commands.executeCommand('workbench.action.toggleDevTools'))
            .on("init", send)
            .on("fileChange", send)

        let route: string;
        const ext = extname(uri.fsPath).toLowerCase()
        if (isImage(ext)) {
            handleImage(handler, uri, webview)
            route = 'image'
        }
        switch (ext) {
            case ".xlsx":
            case ".xlsm":
            case ".xls":
            case ".csv":
            case ".ods":
                route = 'excel';
                break;
            case ".docx":
            case ".dotx":
                route = 'word'
                break;
            case ".jar":
            case ".zip":
            case ".apk":
            case ".vsix":
                route = 'zip';
                handleZip(uri, handler);
                break;
            case ".pdf":
                webview.html = readFileSync(this.extensionPath + "/resource/pdf/viewer.html", 'utf8')
                    .replace("{{baseUrl}}", this.getBaseUrl(webview, 'pdf'))
                break;
            case ".ttf":
            case ".woff":
            case ".woff2":
            case ".otf":
                route = 'font';
                break;
            case ".class":
                handleClass(uri, webviewPanel);
                break;
            case ".htm":
            case ".html":
                webview.html = Util.buildPath(readFileSync(uri.fsPath, 'utf8'), webview, folderPath.fsPath);
                Util.listen(webviewPanel, uri, () => {
                    webviewPanel.webview.html = Util.buildPath(readFileSync(uri.fsPath, 'utf8'), webviewPanel.webview, folderPath.fsPath);
                })
                break;
            default:
                if (route) break;
                vscode.commands.executeCommand('vscode.openWith', uri, "default");
        }
        if (route) return ReactApp.view(webview, { route })
    }

    private getBaseUrl(webview: vscode.Webview, path: string) {
        const baseUrl = webview.asWebviewUri(vscode.Uri.file(`${this.extensionPath}/resource/${path}`))
            .toString().replace(/\?.+$/, '').replace('https://git', 'https://file')
        return baseUrl;
    }

}