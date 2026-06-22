
import { readFileSync } from "fs";
import { basename, dirname } from "path";
import * as vscode from "vscode";
import { Util } from "../common/util";

export class HtmlService {

    public static previewHtml(uri: vscode.Uri, context: vscode.ExtensionContext) {
        const activeEditor = vscode.window.activeTextEditor;
        if (!uri) {
            if (!activeEditor) {
                void vscode.window.showWarningMessage('No HTML file to preview.');
                return;
            }
            uri = activeEditor.document.uri;
        }
        const folderPath = dirname(uri.fsPath);
        const webviewPanel = vscode.window.createWebviewPanel("office-viewer.viewHtml", basename(uri.fsPath), { viewColumn: vscode.ViewColumn.Two, preserveFocus: true }, { enableScripts: true })

        function readContent() {
            const useActiveEditor = activeEditor?.document.uri.toString() === uri.toString();
            const content = useActiveEditor
                ? activeEditor.document.getText()
                : readFileSync(uri.fsPath, 'utf8');
            return Util.buildPath(content, webviewPanel.webview, folderPath);
        }

        webviewPanel.iconPath = vscode.Uri.file(`${context.extensionPath}/icons/html.svg`)
        webviewPanel.webview.html = readContent()

        Util.listen(webviewPanel, uri, () => {
            webviewPanel.webview.html = readContent() + `<input type="hidden" value="${new Date().getTime()}"/>`;
        })
    }

}