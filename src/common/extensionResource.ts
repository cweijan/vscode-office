import * as vscode from 'vscode';

export function getExtensionUri(context: vscode.ExtensionContext): vscode.Uri {
    return context.extensionUri ?? vscode.Uri.file(context.extensionPath);
}

export function extensionResource(context: vscode.ExtensionContext, ...segments: string[]): vscode.Uri {
    return vscode.Uri.joinPath(getExtensionUri(context), ...segments);
}

export async function readExtensionText(context: vscode.ExtensionContext, ...segments: string[]): Promise<string> {
    const bytes = await vscode.workspace.fs.readFile(extensionResource(context, ...segments));
    return new TextDecoder().decode(bytes);
}

export function getExtensionResourceRoots(context: vscode.ExtensionContext): vscode.Uri[] {
    return [getExtensionUri(context)];
}
