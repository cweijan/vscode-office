import * as vscode from 'vscode';

export async function pathExists(uri: vscode.Uri): Promise<boolean> {
    try {
        await vscode.workspace.fs.stat(uri);
        return true;
    } catch {
        return false;
    }
}

export async function ensureParentDirectory(uri: vscode.Uri): Promise<void> {
    const parent = vscode.Uri.joinPath(uri, '..');
    if (await pathExists(parent)) {
        return;
    }
    await ensureParentDirectory(parent);
    await vscode.workspace.fs.createDirectory(parent);
}

export async function readUriText(uri: vscode.Uri): Promise<string> {
    const bytes = await vscode.workspace.fs.readFile(uri);
    return new TextDecoder().decode(bytes);
}
