import { basename } from "path";
import { Uri, ViewColumn, window, type ExtensionContext } from "vscode";
import { Util } from "../common/util";
import { extensionResource, getExtensionResourceRoots } from "../common/extensionResource";
import { readUriText } from "../common/workspaceFs";
import { fileTypeFromPath } from "@/service/officeViewType";
import { TelemetryService } from "@/service/telemetryService";
import { i18n } from "@/common/global";

export class HtmlService {

    public static previewHtml(uri: Uri, context: ExtensionContext) {
        const activeEditor = window.activeTextEditor;
        if (!uri) {
            if (!activeEditor) {
                void window.showWarningMessage(i18n('ext.html.noFile'));
                return;
            }
            uri = activeEditor.document.uri;
        }
        TelemetryService.get()?.trackViewOpen('previewHtml', fileTypeFromPath(uri.fsPath));
        const folderUri = Uri.joinPath(uri, '..');
        const webviewPanel = window.createWebviewPanel(
            "office-viewer.viewHtml", basename(uri.fsPath),
            { viewColumn: ViewColumn.Two, preserveFocus: true },
            {
                retainContextWhenHidden: true,
                enableScripts: true,
                localResourceRoots: [...getExtensionResourceRoots(context), folderUri],
            }
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
