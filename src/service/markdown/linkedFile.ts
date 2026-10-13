import * as vscode from 'vscode';
import { i18n } from '@/common/global';

export interface LinkOpenError {
    error: 'fileNotFound' | 'openFailed';
    message: string;
}

export function linkedFileNotFound(path: string): LinkOpenError {
    const name = path.replace(/\\/g, '/').split('/').pop() || path;
    return { error: 'fileNotFound', message: i18n('ext.markdown.linkFileNotFound', name) };
}

export async function checkLinkedFile(uri: vscode.Uri): Promise<LinkOpenError | undefined> {
    try {
        await vscode.workspace.fs.stat(uri.with({ query: '', fragment: '' }));
    } catch (error) {
        if (error.code === 'FileNotFound') {
            return linkedFileNotFound(uri.fsPath);
        }
        const name = uri.path.split('/').pop() || uri.path;
        return { error: 'openFailed', message: i18n('ext.markdown.linkOpenFailed', name, error.message) };
    }
}

export async function openLinkedFile(uri: vscode.Uri): Promise<LinkOpenError | undefined> {
    const error = await checkLinkedFile(uri);
    if (error) return error;
    await vscode.commands.executeCommand('vscode.open', uri, { preview: false });
}
