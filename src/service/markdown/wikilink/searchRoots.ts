import * as vscode from 'vscode';

/** 从当前笔记目录向上到工作区根，作为 Obsidian 笔记库根的候选 */
export function buildSearchRootUris(currentUri: vscode.Uri, workspaceUri?: vscode.Uri): vscode.Uri[] {
    const roots: vscode.Uri[] = [];
    let dir = vscode.Uri.joinPath(currentUri.with({ query: '', fragment: '' }), '..');
    const workspacePath = workspaceUri?.fsPath;

    while (true) {
        roots.push(dir);
        if (workspacePath && dir.fsPath === workspacePath) {
            break;
        }
        const parent = vscode.Uri.joinPath(dir, '..');
        if (parent.fsPath === dir.fsPath) {
            break;
        }
        dir = parent;
    }
    return roots;
}
