import * as vscode from 'vscode';
import { join, parse } from 'path';
import { Handler } from "@/common/handler";
import { isUriReadOnly } from '@/common/fileReadOnly';
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

function setDirty(handler: Handler, dirty: boolean) {
    const panel = handler.panel;
    const title = panel.title.replace(/^● /, '');
    panel.title = dirty ? `● ${title}` : title;
    if (dirty) {
        void vscode.commands.executeCommand('workbench.action.keepEditor');
    }
}

export function handleCommonEvent(uri: Uri, handler: Handler, options?: { skipOpen?: boolean }) {
    let readOnly = false;
    const send = async () => {
        if (shouldSkipFileChange(uri)) {
            return;
        }
        if (isVirtualUri(uri)) {
            readOnly = true;
            void emitVirtualOfficeOpen(handler, uri);
            return;
        }
        readOnly = await isUriReadOnly(uri);
        await emitFileOfficeOpen(handler, uri, handler.panel.webview);
    }
    const events = handler
        .on("editInVSCode", (full: boolean) => {
            const side = full ? vscode.ViewColumn.Active : vscode.ViewColumn.Beside;
            vscode.commands.executeCommand('vscode.openWith', uri, "default", side);
        })
    if (!options?.skipOpen) {
        events.on("init", () => { void send(); }).on("fileChange", () => { void send(); })
    }
    events
        .on("change", () => {
            setDirty(handler, true);
        })
        .on("save", async (content) => {
            const res = Array.isArray(content) ? new Uint8Array(content) : new TextEncoder().encode(content)
            if (readOnly) {
                handler.emit('saveAs', { content: [...res] });
                return;
            }
            await workspace.fs.writeFile(uri, res)
            fileSaveTimes[uri.toString()] = Date.now();
            setDirty(handler, false);
            handler.emit("saveDone")
        })
        .on("saveAs", async (payload: { content: number[], ext?: string }) => {
            const res = new Uint8Array(payload.content);
            const ext = (payload.ext ?? 'xlsx').toLowerCase();
            const { dir, name } = parse(uri.fsPath);
            const defaultFileName = `${name}.${ext}`;
            const defaultUri = uri.scheme === 'file'
                ? Uri.file(join(dir, defaultFileName))
                : Uri.joinPath(uri, '..', defaultFileName);
            const filterMap: Record<string, { label: string; exts: string[] }> = {
                xlsx: { label: 'Excel Workbook', exts: ['xlsx'] },
                xlsm: { label: 'Excel Macro-Enabled Workbook', exts: ['xlsm'] },
                xls: { label: 'Excel 97-2003 Workbook', exts: ['xls'] },
                ods: { label: 'OpenDocument Spreadsheet', exts: ['ods'] },
                csv: { label: 'CSV (Comma delimited)', exts: ['csv'] },
            };
            const info = filterMap[ext] ?? { label: ext.toUpperCase(), exts: [ext] };
            const target = await vscode.window.showSaveDialog({
                defaultUri,
                filters: { [info.label]: info.exts },
            });
            if (!target) return;
            await workspace.fs.writeFile(target, res);
            fileSaveTimes[target.toString()] = Date.now();
            setDirty(handler, false);
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