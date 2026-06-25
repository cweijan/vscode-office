import * as vscode from 'vscode';
import { Handler } from '@/common/handler';

const pendingBlockScroll = new Map<string, string>();
const webviewHandlers = new Map<string, Handler>();

export function registerMarkdownWebview(uri: vscode.Uri, handler: Handler): void {
    webviewHandlers.set(uri.toString(), handler);
}

export function unregisterMarkdownWebview(uri: vscode.Uri): void {
    webviewHandlers.delete(uri.toString());
}

export function getMarkdownWebviewHandler(uri: vscode.Uri): Handler | undefined {
    return webviewHandlers.get(uri.toString());
}

export function setPendingBlockScroll(uri: vscode.Uri, fragment: string): void {
    pendingBlockScroll.set(uri.toString(), fragment);
}

export function consumePendingBlockScroll(uri: vscode.Uri): string | undefined {
    const key = uri.toString();
    const fragment = pendingBlockScroll.get(key);
    if (fragment) {
        pendingBlockScroll.delete(key);
    }
    return fragment;
}

export function notifyBlockScroll(uri: vscode.Uri, fragment: string): void {
    const handler = getMarkdownWebviewHandler(uri);
    if (!handler) {
        setPendingBlockScroll(uri, fragment);
        return;
    }
    setTimeout(() => {
        handler.emit('gotoBlock', fragment);
    }, 150);
}
