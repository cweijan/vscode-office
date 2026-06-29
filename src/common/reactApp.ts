import axios from 'axios';
import * as vscode from 'vscode';
import { extensionResource, getExtensionUri, readExtensionText } from './extensionResource';
import { IconService } from '../service/icon/iconService';

interface ViewOption {
    route: string;
    fileName?: string;
    gitHistoryInit?: import('../gitHistory/util/gitHistoryInitPayload').GitHistoryEmbeddedInit;
}

export class ReactApp {

    private static context: vscode.ExtensionContext;
    private static webviewUri: vscode.Uri;
    public static IS_DEV = false;

    public static init(context: vscode.ExtensionContext) {
        this.context = context;
        this.webviewUri = extensionResource(context, 'out', 'webview');
        this.IS_DEV = context.extensionMode == vscode.ExtensionMode.Development;
    }

    public static async view(webview: vscode.Webview, option: ViewOption) {
        const html = await this.readContent();
        const iconConfig = IconService.getInstance().getWebviewConfig(this.context, webview);
        const isPro = !!this.context.globalState.get<string>('office.pro.licenseKey');
        const sponsorBaseUrl = isPro ? undefined : webview.asWebviewUri(
            extensionResource(this.context, 'resource', 'sponsor')
        ).toString();
        webview.html = this.buildPath(html, webview)
            .replace(`{{configs}}`, JSON.stringify({
                ...option,
                ...iconConfig,
                sponsorBaseUrl,
                language: vscode.env.language,
                config: vscode.workspace.getConfiguration('vscode-office')
            }));
    }

    private static async readContent(): Promise<string> {
        if (this.IS_DEV) {
            const data: string = (await axios.get(`http://127.0.0.1:5739/index.html`, { transformResponse: [] })).data;
            return data.replace('/@vite/client', 'http://127.0.0.1:5739/@vite/client');
        }
        return readExtensionText(this.context, 'out', 'webview', 'index.html');
    }

    private static buildPath(data: string, webview: vscode.Webview): string {
        const baseUrl = ReactApp.getBaseUrl(webview);
        return data.replace('<base href="/">', `<base href="${baseUrl}/">`);
    }

    private static getBaseUrl(webview: vscode.Webview) {
        if (this.IS_DEV) {
            return `http://127.0.0.1:5739`;
        }
        return webview.asWebviewUri(this.webviewUri).toString();
    }

    public static getExtensionUri(): vscode.Uri {
        return getExtensionUri(this.context);
    }

}
