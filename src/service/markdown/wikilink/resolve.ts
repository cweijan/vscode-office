import { dirname } from 'path';
import * as vscode from 'vscode';
import { pickBestPath } from './fileMatch';
import { findMarkdownInScope, findMarkdownRecursive, statMarkdownAt } from './fileSearch';
import { normalizePage } from './parse';
import { buildSearchRoots } from './searchRoots';

export async function resolveWikiLinkFile(
    currentUri: vscode.Uri,
    page: string,
): Promise<vscode.Uri | null> {
    const normalized = normalizePage(page);
    if (!normalized || normalized.startsWith('#')) {
        return currentUri;
    }

    const workspaceFolder = vscode.workspace.getWorkspaceFolder(currentUri);
    const workspacePath = workspaceFolder?.uri.fsPath;
    const roots = buildSearchRoots(dirname(currentUri.fsPath), workspacePath);

    // 1. 祖先目录直接 stat（最快，桌面 / Web 均可用）
    for (const root of roots) {
        const found = await statMarkdownAt(root, normalized);
        if (found) {
            return found;
        }
    }

    if (!workspaceFolder || !workspacePath) {
        return null;
    }

    // 2. 各祖先目录内 findFiles 精确匹配（处理 stat 权限等边缘情况）
    for (const root of roots) {
        if (!root.startsWith(workspacePath)) {
            continue;
        }
        const scoped = await findMarkdownInScope(workspaceFolder, root, normalized);
        const best = pickBestPath(scoped.map((uri) => uri.fsPath), normalized);
        if (best) {
            return vscode.Uri.file(best);
        }
    }

    // 3. 工作区递归 ** 匹配（笔记库根不在工作区根时兜底）
    const recursiveHits = await findMarkdownRecursive(workspaceFolder, workspacePath, normalized);
    const best = pickBestPath(recursiveHits.map((uri) => uri.fsPath), normalized);
    return best ? vscode.Uri.file(best) : null;
}
