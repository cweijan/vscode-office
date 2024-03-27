import axios from 'axios';
import * as fs from 'fs';
import * as vscode from 'vscode';

interface ViewOption {
    route: string;
}

export class ReactApp {

    private static webviewPath: string;
    public static IS_DEV = false;
    public static init(context: vscode.ExtensionContext) {
        this.webviewPath = context.extensionPath + '/out/webview'
        this.IS_DEV = context.extensionMode == vscode.ExtensionMode.Development
    }

    public static async view(webview: vscode.Webview, option: ViewOption) {
        const html = await this.readContent()
        webview.html = this.buildPath(html, webview)
            .replace(`{{configs}}`, JSON.stringify({
                ...option,
                language: vscode.env.language,
                config: vscode.workspace.getConfiguration('vscode-office')
            }))
    }

    private static async readContent(): Promise<string> {
        if (this.IS_DEV) {
            const data: string = (await axios.get(`http://127.0.0.1:5739/index.html`, { transformResponse: [] })).data;
            return data.replace('/@vite/client', 'http://127.0.0.1:5739/@vite/client')
        }
        const targetPath = `${this.webviewPath}/index.html`;
        return fs.readFileSync(targetPath, 'utf8')
    }

    private static buildPath(data: string, webview: vscode.Webview): string {
        const baseUrl = ReactApp.getBaseUrl(webview);
        return data.replace('<base href="/">', `<base href="${baseUrl}/">`);
    }

    private static getBaseUrl(webview: vscode.Webview) {
        if (this.IS_DEV) {
            return `http://127.0.0.1:5739`;
        }
        return webview.asWebviewUri(vscode.Uri.file(this.webviewPath)).toString();
    }

}
