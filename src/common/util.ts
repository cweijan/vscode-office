import * as vscode from 'vscode';
import { i18n } from '@/common/global';

export class Util {
    public static buildPath(data: string, webview: vscode.Webview, contextPath: string | vscode.Uri): string {
        const baseUri = typeof contextPath === 'string' ? vscode.Uri.file(contextPath) : contextPath;
        return data.replace(/((src|href)=("|')?)(\/\/)/gi, "$1http://")
            .replace(/((src|href)=("|'))((?!(?:https?:|#|data:|mailto:|javascript:|blob:)).+?["'])/gi, "$1" + webview.asWebviewUri(baseUri) + "/$4");
    }

    public static listen(webviewPanel: vscode.WebviewPanel, uri: vscode.Uri, callback: () => void, disposeCallback?: () => void) {
        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() === uri.toString()) {
                callback();
            }
        });
        webviewPanel.onDidDispose(() => {
            changeDocumentSubscription.dispose()
        });
    }

    public static async confirm(title: string, placeHolder: string, callback?: () => void): Promise<boolean> {
        return this.confirmActual({ title, placeHolder }, callback)
    }

    public static async confirmActual(options: vscode.QuickPickOptions, callback?: () => void): Promise<boolean> {
        const yes = i18n('ext.common.yes');
        const no = i18n('ext.common.no');
        const res = await vscode.window.showQuickPick([yes, no], options);
        if (res === yes && callback) {
            await callback();
            return true;
        }
        return res === yes;
    }
  
    public static limitTitle(title: string): string {
        return title.length <= 30 ? title : title.substring(0, 25) + '...';
    }

}
