import * as vscode from 'vscode';

enum Confirm {
    YES = "YES", NO = "NO"
}

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
        const res = await vscode.window.showQuickPick([Confirm.YES, Confirm.NO], options);
        const yes = res == Confirm.YES;
        if (yes && callback) {
            await callback()
            return true;
        }
        return yes;
    }
  
    public static limitTitle(title: string): string {
        return title.length <= 30 ? title : title.substring(0, 25) + '...';
    }

}
