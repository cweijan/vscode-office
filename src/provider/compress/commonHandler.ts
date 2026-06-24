import * as vscode from 'vscode';
import { join, parse } from 'path';
import { Handler } from "@/common/handler";
import { Uri, workspace } from 'vscode';
import { emitFileOfficeOpen, emitVirtualOfficeOpen, isVirtualUri } from '@/provider/handlers/officeContent';

const fileSaveTimes: Record<string, number> = {};

function buildDefaultXlsxUri(uri: Uri): Uri {
    const { dir, name } = parse(uri.fsPath);
    const fileName = `${name}.xlsx`;
    if (uri.scheme === 'file') {
        return Uri.file(join(dir, fileName));
    }
    return Uri.joinPath(uri, '..', fileName);
}

export function shouldSkipFileChange(uri: Uri): boolean {
    const lastSaveTime = fileSaveTimes[uri.toString()];
    return !!(lastSaveTime && Date.now() - lastSaveTime < 100);
}

export function handleCommonEvent(uri: Uri, handler: Handler, options?: { skipOpen?: boolean }) {
    const send = () => {
        if (shouldSkipFileChange(uri)) {
            return;
        }
        if (isVirtualUri(uri)) {
            void emitVirtualOfficeOpen(handler, uri);
            return;
        }
        emitFileOfficeOpen(handler, uri, handler.panel.webview);
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
        .on("saveAs", async (payload: { content: number[] }) => {
            const res = new Uint8Array(payload.content);
            const defaultUri = buildDefaultXlsxUri(uri);
            const target = await vscode.window.showSaveDialog({
                defaultUri,
                filters: { 'Excel Workbook': ['xlsx'] },
            });
            if (!target) return;
            await workspace.fs.writeFile(target, res);
            fileSaveTimes[target.toString()] = Date.now();
            handler.emit("saveDone");
            await vscode.commands.executeCommand('vscode.openWith', target, 'cweijan.officeViewer');
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