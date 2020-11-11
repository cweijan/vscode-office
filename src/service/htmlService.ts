
import { readFileSync } from "fs";
import { basename, resolve } from "path";
import * as vscode from "vscode";
import { Util } from "../common/util";

export class HtmlService {

    public static previewHtml(uri: vscode.Uri) {
        if (!uri) {
            uri = vscode.window.activeTextEditor.document.uri
        }
        const folderPath = vscode.Uri.file(resolve(uri.fsPath, ".."));
        const webviewPanel = vscode.window.createWebviewPanel("cwejan.viewHtml", basename(uri.fsPath), { viewColumn: vscode.ViewColumn.Two, preserveFocus: true }, { enableScripts: true })
        webviewPanel.webview.html = Util.buildPath(readFileSync(uri.fsPath, 'utf8'), webviewPanel.webview, folderPath.fsPath);
        Util.listen(webviewPanel, uri, () => {
            webviewPanel.webview.html = Util.buildPath(readFileSync(uri.fsPath, 'utf8'), webviewPanel.webview, folderPath.fsPath);
        })
    }

}