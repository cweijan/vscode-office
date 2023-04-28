import axios from 'axios';
import * as fs from 'fs';
import * as vscode from 'vscode';


export class ViewManager {

    private static webviewPath: string;
    public static IS_DEV = false;
    public static init(context: vscode.ExtensionContext) {
        this.webviewPath = context.extensionPath + '/out/webview'
        this.IS_DEV = context.extensionMode == vscode.ExtensionMode.Development
    }

    public static async buildPath(data: string, webview: vscode.Webview): Promise<string> {
        const baseUrl = await ViewManager.getBaseUrl(webview);
        return data.replace('<base href="/">', `<base href="${baseUrl}/">`);
    }

    public static async readContent(): Promise<string> {
        if (this.IS_DEV) {
            const data: string = (await axios.get(`http://127.0.0.1:8593/index.html`, { transformResponse: [] })).data;
            return data.replace('/@vite/client', 'http://127.0.0.1:8593/@vite/client')
        }
        const targetPath = `${this.webviewPath}/index.html`;
        return fs.readFileSync(targetPath, 'utf8')
    }

    private static async getBaseUrl(webview: vscode.Webview) {
        if (this.IS_DEV) {
            return `http://127.0.0.1:8593`;
        }
        return webview.asWebviewUri(vscode.Uri.file(this.webviewPath)).toString();
    }
}
