import * as vscode from 'vscode';
import { Handler } from "@/common/handler";
import { Uri, workspace } from 'vscode';
import { extname } from 'path';

const fileSaveTimes: Record<string, number> = {};

export function shouldSkipFileChange(uri: Uri): boolean {
    const lastSaveTime = fileSaveTimes[uri.toString()];
    return !!(lastSaveTime && Date.now() - lastSaveTime < 100);
}

export function handleCommonEvent(uri: Uri, handler: Handler, options?: { skipOpen?: boolean }) {
    const send = () => {
        if (shouldSkipFileChange(uri)) {
            return;
        }
        const now = Date.now();
        handler.emit("open", {
            ext: extname(uri.fsPath),
            path: handler.panel.webview.asWebviewUri(uri).with({ query: `nonce=${now.toString()}` }).toString(),
        })
    }
    const events = handler
        .on("editInVSCode", (full: boolean) => {
            const side = full ? vscode.ViewColumn.Active : vscode.ViewColumn.Beside;
            vscode.commands.executeCommand('vscode.openWith', uri, "default", side);
        })
    if (!options?.skipOpen) {
        events.on("init", send).on("fileChange", send)
    }
    events
        .on("save", async (content) => {
            const res = Array.isArray(content) ? new Uint8Array(content) : new TextEncoder().encode(content)
            await workspace.fs.writeFile(uri, res)
            fileSaveTimes[uri.toString()] = Date.now();
            handler.emit("saveDone")
        })
        .on('developerTool', () => vscode.commands.executeCommand('workbench.action.toggleDevTools'))
        .on('openSponsor', () => {
            vscode.commands.executeCommand(
                'workbench.extensions.action.showExtensionsWithIds',
                ['cweijan.vscode-database-client2'],
            );
        })
        .on('openExternal', (url: string) => {
            if (url) {
                vscode.env.openExternal(vscode.Uri.parse(url));
            }
        })
        .on('dispose', () => {
            delete fileSaveTimes[uri.toString()];
        })
}