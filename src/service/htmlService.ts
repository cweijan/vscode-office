import { readFileSync } from "fs";
import { basename, dirname } from "path";
import { Uri, ViewColumn, window, type ExtensionContext } from "vscode";
import { Util } from "../common/util";
import { fileTypeFromPath } from "@/service/officeViewType";
import { TelemetryService } from "@/service/telemetryService";

export class HtmlService {

    public static previewHtml(uri: Uri, context: ExtensionContext) {
        const activeEditor = window.activeTextEditor;
        if (!uri) {
            if (!activeEditor) {
                void window.showWarningMessage('No HTML file to preview.');
                return;
            }
            uri = activeEditor.document.uri;
        }
        TelemetryService.get()?.trackViewOpen('previewHtml', fileTypeFromPath(uri.fsPath));
        const folderPath = dirname(uri.fsPath);
        const webviewPanel = window.createWebviewPanel(
            "office-viewer.viewHtml", basename(uri.fsPath),
            { viewColumn: ViewColumn.Two, preserveFocus: true },
            { retainContextWhenHidden: true, enableScripts: true }
        )

        function readContent() {
            const useActiveEditor = activeEditor?.document.uri.toString() === uri.toString();
            const content = useActiveEditor
                ? activeEditor.document.getText()
                : readFileSync(uri.fsPath, 'utf8');
            return Util.buildPath(content, webviewPanel.webview, folderPath);
        }

        webviewPanel.iconPath = Uri.file(`${context.extensionPath}/icons/html.svg`)
        webviewPanel.webview.html = readContent()

        Util.listen(webviewPanel, uri, () => {
            webviewPanel.webview.html = readContent() + `<input type="hidden" value="${new Date().getTime()}"/>`;
        })
    }

}