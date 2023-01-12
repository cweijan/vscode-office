import { parse } from 'path';
import * as vscode from 'vscode';

enum Confirm {
    YES = "YES", NO = "NO"
}

export class Util {
    public static buildPath(data: string, webview: vscode.Webview, contextPath: string): string {
        return data.replace(/((src|href)=("|')?)(\/\/)/gi, "$1http://")
            .replace(/((src|href)=("|'))((?!(http|#)).+?["'])/gi, "$1" + webview.asWebviewUri(vscode.Uri.file(`${contextPath}`)) + "/$4");
    }

    public static listen(webviewPanel: vscode.WebviewPanel, uri: vscode.Uri, callback: () => void, disposeCallback?: () => void) {
        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(callback);
        webviewPanel.onDidDispose(() => {
            changeDocumentSubscription.dispose()
        });
    }

    public static async confirm(title: string, placeHolder: string, callback?: () => void): Promise<boolean> {
        return this.confirmActual({ title, placeHolder }, callback)
    }

    public static async confirmActual(options: vscode.QuickPickOptions, callback?: () => void): Promise<boolean> {
        const res = await vscode.window.showQuickPick([Confirm.YES, Confirm.NO], options);
        const yes = res == Confirm.YES;
        if (yes && callback) {
            await callback()
            return true;
        }
        return yes;
    }

    public static adjustImgPath(uri: vscode.Uri) {
        return vscode.workspace.getConfiguration("vscode-office").get<string>("pasterImgPath")
            .replace("${workspaceDir}", this.getWorkspacePath(uri))
            .replace("${fileName}", parse(uri.fsPath).name.replace(/\s/g, ''))
            .replace("${now}", new Date().getTime() + "")
    }

    /**
     * 根据uri获取其工作空间路径
     * @param uri 
     * @returns 
     */
    private static getWorkspacePath(uri: vscode.Uri) {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders || folders.length == 0) return '';
        let workspacePath = folders[0]?.uri?.fsPath;
        if (folders.length > 1) {
            for (const folder of folders) {
                if (uri.fsPath.includes(folder.uri.fsPath)) {
                    return folder.uri.fsPath;
                }
            }
        }
        return workspacePath;
    }
}