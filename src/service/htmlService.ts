
import { readFileSync } from "fs";
import { basename, resolve } from "path";
import * as vscode from "vscode";
import { Util } from "../common/util";

export class HtmlService {

    public static previewHtml(uri: vscode.Uri) {
        const av= vscode.window.activeTextEditor.document;
        if (!uri) {
            uri = av.uri
        }
        const folderPath = vscode.Uri.file(resolve(uri.fsPath, ".."));
        const webviewPanel = vscode.window.createWebviewPanel("cwejan.viewHtml", basename(uri.fsPath), { viewColumn: vscode.ViewColumn.Two, preserveFocus: true }, { enableScripts: true })

        function readContent(){
            return av?av.getText():Util.buildPath(readFileSync(uri.fsPath, 'utf8'), webviewPanel.webview, folderPath.fsPath);
        }

        webviewPanel.webview.html = readContent();
        Util.listen(webviewPanel, uri, () => {
            webviewPanel.webview.html = readContent();
        })
    }

}