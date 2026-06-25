import * as vscode from 'vscode';
import { notifyBlockScroll } from '@/service/markdown/blockScroll';
import { WIKI_URI_PREFIX } from './constants';
import { findFragmentPosition } from './fragment';
import { parseWikiLinkUri } from './parse';
import { resolveWikiLinkFile } from './resolve';

export async function openWikiLink(currentUri: vscode.Uri, wikiUri: string): Promise<void> {
    const target = parseWikiLinkUri(wikiUri);
    if (!target) {
        return;
    }

    const fileUri = await resolveWikiLinkFile(currentUri, target.page);
    if (!fileUri) {
        const label = target.page || wikiUri.slice(WIKI_URI_PREFIX.length);
        void vscode.window.showWarningMessage(`找不到双链目标：${label}`);
        return;
    }

    const openOptions: vscode.TextDocumentShowOptions = { preview: false };
    if (target.fragment) {
        try {
            const doc = await vscode.workspace.openTextDocument(fileUri);
            const position = findFragmentPosition(doc, target.fragment);
            if (position) {
                openOptions.selection = new vscode.Range(position, position);
            }
        } catch {
        }
        notifyBlockScroll(fileUri, target.fragment);
    }

    await vscode.commands.executeCommand('vscode.open', fileUri, openOptions);
}
