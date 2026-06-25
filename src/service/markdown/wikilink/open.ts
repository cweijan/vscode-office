import * as vscode from 'vscode';
import {
    getMarkdownWebviewHandler,
    notifyBlockScroll,
    setPendingBlockScroll,
} from '@/service/markdown/blockScroll';
import { WIKI_URI_PREFIX } from './constants';
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

    const baseUri = fileUri.with({ query: '', fragment: '' });
    const hasExistingWebview = !!getMarkdownWebviewHandler(baseUri);

    if (target.fragment && !hasExistingWebview) {
        setPendingBlockScroll(baseUri, target.fragment);
    }

    await vscode.commands.executeCommand('vscode.open', baseUri, { preview: false });

    if (hasExistingWebview && target.fragment) {
        notifyBlockScroll(baseUri, target.fragment);
    }
}
