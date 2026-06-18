import { ReactApp } from '@/common/reactApp';
import { readFileSync } from 'fs';
import * as vscode from 'vscode';
import { Handler } from '../common/handler';
import { Util } from '../common/util';
import { handleClass } from './handlers/classHandler';
import { handleImage, isImage } from './handlers/imageHanlder';
import { handleSvg } from './handlers/svgHandler';
import { getFileSuffix } from '@/service/compress/archiveUtils';
import { handleZip } from './compress/zipHandler';
import { handleRar } from './compress/rarHandler';
import { handleTarGz } from './compress/tarHandler';
import { handleSevenZip } from './compress/sevenZipHandler';
import { handleCommonEvent } from './compress/commonHandler';
import { TelemetryService } from '@/service/telemetryService';

/**
 * support view office files
 */
export class OfficeViewerProvider implements vscode.CustomReadonlyEditorProvider {

    private extensionPath: string;

    constructor(private context: vscode.ExtensionContext) {
        this.extensionPath = context.extensionPath;
    }

    bindCustomEditors(viewOption: { webviewOptions: vscode.WebviewPanelOptions }) {
        const viewers = ['cweijan.officeViewer', 'cweijan.imageViewer', 'cweijan.heicTiffViewer', 'cweijan.icnsViewer', 'cweijan.psdViewer', 'cweijan.xmindViewer', 'cweijan.htmlViewer', 'cweijan.classViewer']
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

        const handler = Handler.bind(webviewPanel, uri)

        let route: string;
        const suffix = getFileSuffix(uri.fsPath);
        const isSvg = /\.svg$/i.test(suffix);
        handleCommonEvent(uri, handler, isSvg ? { skipOpen: true } : undefined)
        if (isSvg) {
            route = 'svg';
            handleSvg(handler, uri);
        } else if (isImage(suffix)) {
            handleImage(handler, uri, webview)
            route = 'image'
        }
        switch (suffix) {
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
            case ".pptx":
            case ".pptm":
                route = 'ppt'
                break;
            case ".zip":
            case ".jar":
            case ".apk":
            case ".vsix":
                route = 'zip';
                handleZip(uri, handler);
                break;
            case ".7z":
                route = 'zip';
                handleSevenZip(uri, handler);
                break;
            case ".rar":
                route = 'zip';
                handleRar(uri, handler);
                break;
            case ".tar.gz":
                route = 'zip';
                handleTarGz(uri, handler, true);
                break;
            case ".tar":
                route = 'zip';
                handleTarGz(uri, handler, false);
                break;
            case ".ttf":
            case ".woff":
            case ".woff2":
            case ".otf":
                route = 'font';
                break;
            case ".pdf":
                webview.html = readFileSync(this.extensionPath + "/resource/pdf/viewer.html", 'utf8')
                    .replace("{{baseUrl}}", this.getBaseUrl(webview, 'pdf'))
                break;
            case ".epub":
                route = 'epub';
                break;
            case ".icns":
                route = 'icns';
                break;
            case ".psd":
                route = 'psd';
                break;
            case ".xmind":
                route = 'xmind';
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
        TelemetryService.get()?.trackOfficeViewOpen(uri.fsPath, route);
        if (route) return ReactApp.view(webview, { route })
    }

    private getBaseUrl(webview: vscode.Webview, path: string) {
        const baseUrl = webview.asWebviewUri(vscode.Uri.file(`${this.extensionPath}/resource/${path}`))
            .toString().replace(/\?.+$/, '').replace('https://git', 'https://file')
        return baseUrl;
    }

}