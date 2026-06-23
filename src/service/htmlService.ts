import { basename } from "path";
import { Uri, ViewColumn, window, workspace, type ExtensionContext } from "vscode";
import { Util } from "../common/util";
import { extensionResource } from "../common/extensionResource";
import { readUriText } from "../common/workspaceFs";
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
        const folderUri = Uri.joinPath(uri, '..');
        const webviewPanel = window.createWebviewPanel(
            "office-viewer.viewHtml", basename(uri.fsPath),
            { viewColumn: ViewColumn.Two, preserveFocus: true },
            { retainContextWhenHidden: true, enableScripts: true }
        )

        const render = async () => {
            const useActiveEditor = activeEditor?.document.uri.toString() === uri.toString();
            const content = useActiveEditor
                ? activeEditor.document.getText()
                : await readUriText(uri);
            webviewPanel.webview.html = Util.buildPath(content, webviewPanel.webview, folderUri);
        };

        webviewPanel.iconPath = extensionResource(context, 'icons', 'html.svg');
        void render();

        Util.listen(webviewPanel, uri, () => {
            void render().then(() => {
                webviewPanel.webview.html += `<input type="hidden" value="${new Date().getTime()}"/>`;
            });
        })
    }

}
