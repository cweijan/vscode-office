import * as vscode from 'vscode';

export function switchCsvEditor(uri?: vscode.Uri) {
    const editor = vscode.window.activeTextEditor;
    const targetUri = uri ?? editor?.document.uri;
    if (!targetUri) return;
    const viewType = editor ? 'cweijan.officeViewer' : 'default';
    void vscode.commands.executeCommand('vscode.openWith', targetUri, viewType);
}
