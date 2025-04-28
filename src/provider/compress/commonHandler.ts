import * as vscode from 'vscode';
import { Handler } from "@/common/handler";
import { Uri, workspace } from 'vscode';
import { extname } from 'path';

const fileSaveTimes: Record<string, number> = {};

export function handleCommonEvent(uri: Uri, handler: Handler) {
    const send = () => {
        const now = Date.now();
        const lastSaveTime = fileSaveTimes[uri.toString()];
        if (lastSaveTime && now - lastSaveTime < 100) {
            return;
        }
        handler.emit("open", {
            ext: extname(uri.fsPath),
            path: handler.panel.webview.asWebviewUri(uri).with({ query: `nonce=${now.toString()}` }).toString(),
        })
    }
    handler
        .on("editInVSCode", (full: boolean) => {
            const side = full ? vscode.ViewColumn.Active : vscode.ViewColumn.Beside;
            vscode.commands.executeCommand('vscode.openWith', uri, "default", side);
        })
        .on("init", send)
        .on("fileChange", send)
        .on("save", async (content) => {
            const res = Array.isArray(content) ? new Uint8Array(content) : new TextEncoder().encode(content)
            await workspace.fs.writeFile(uri, res)
            fileSaveTimes[uri.toString()] = Date.now();
            handler.emit("saveDone")
        })
        .on('developerTool', () => vscode.commands.executeCommand('workbench.action.toggleDevTools'))
        .on('dispose', () => {
            delete fileSaveTimes[uri.toString()];
        })
}