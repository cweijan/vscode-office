import * as vscode from 'vscode';
import { pickBestUri } from './fileMatch';
import { findMarkdownInScope, findMarkdownRecursive, statMarkdownAt } from './fileSearch';
import { normalizePage } from './parse';
import { buildSearchRootUris } from './searchRoots';

export async function resolveWikiLinkFile(
    currentUri: vscode.Uri,
    page: string,
): Promise<vscode.Uri | null> {
    const normalized = normalizePage(page);
    if (!normalized || normalized.startsWith('#')) {
        return currentUri;
    }

    const workspaceFolder = vscode.workspace.getWorkspaceFolder(currentUri);
    const workspaceUri = workspaceFolder?.uri;
    const roots = buildSearchRootUris(currentUri, workspaceUri);

    // 1. 祖先目录直接 stat（最快，桌面 / Web / Remote 均可用）
    for (const root of roots) {
        const found = await statMarkdownAt(root, normalized);
        if (found) {
            return found;
        }
    }

    if (!workspaceFolder || !workspaceUri) {
        return null;
    }

    const workspacePath = workspaceUri.fsPath;

    // 2. 各祖先目录内 findFiles 精确匹配（处理 stat 权限等边缘情况）
    for (const root of roots) {
        if (!root.fsPath.startsWith(workspacePath)) {
            continue;
        }
        const scoped = await findMarkdownInScope(workspaceFolder, root.fsPath, normalized);
        const best = pickBestUri(scoped, normalized);
        if (best) {
            return best;
        }
    }

    // 3. 工作区递归 ** 匹配（笔记库根不在工作区根时兜底）
    const recursiveHits = await findMarkdownRecursive(workspaceFolder, workspacePath, normalized);
    return pickBestUri(recursiveHits, normalized);
}
