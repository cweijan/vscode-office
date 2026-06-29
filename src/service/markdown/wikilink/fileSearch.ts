import { relative } from 'path';
import * as vscode from 'vscode';
import { FIND_FILES_EXCLUDE, FIND_FILES_LIMIT } from './constants';
import { directFileNames, recursiveFindPatterns } from './pagePattern';

/** 直接路径探测：祖先目录 + 文件名，走 fs.stat，避免索引查询 */
export async function statMarkdownAt(baseDir: vscode.Uri, page: string): Promise<vscode.Uri | null> {
    for (const fileName of directFileNames(page)) {
        const fileUri = vscode.Uri.joinPath(baseDir, fileName);
        try {
            const stat = await vscode.workspace.fs.stat(fileUri);
            if (stat.type === vscode.FileType.File) {
                return fileUri;
            }
        } catch {
        }
    }
    return null;
}

function toRelativePattern(
    workspaceFolder: vscode.WorkspaceFolder,
    scopeDir: string,
    pattern: string,
): vscode.RelativePattern {
    const workspacePath = workspaceFolder.uri.fsPath;
    const relScope = relative(workspacePath, scopeDir).replace(/\\/g, '/');
    const fullPattern = relScope && relScope !== '.'
        ? `${relScope}/${pattern}`
        : pattern;
    return new vscode.RelativePattern(workspaceFolder, fullPattern);
}

/** 在 scopeDir 下用 findFiles 做精确相对匹配（非 **） */
export async function findMarkdownInScope(
    workspaceFolder: vscode.WorkspaceFolder,
    scopeDir: string,
    page: string,
): Promise<vscode.Uri[]> {
    const results: vscode.Uri[] = [];
    for (const fileName of directFileNames(page)) {
        const pattern = toRelativePattern(workspaceFolder, scopeDir, fileName);
        const files = await vscode.workspace.findFiles(pattern, FIND_FILES_EXCLUDE, FIND_FILES_LIMIT);
        for (const file of files) {
            results.push(file);
        }
    }
    return results;
}

/** 在工作区（或子目录）内递归查找，模式形如 **/
export async function findMarkdownRecursive(
    workspaceFolder: vscode.WorkspaceFolder,
    scopeDir: string,
    page: string,
): Promise<vscode.Uri[]> {
    const workspacePath = workspaceFolder.uri.fsPath;
    const relScope = relative(workspacePath, scopeDir).replace(/\\/g, '/');
    const prefix = relScope && relScope !== '.' ? `${relScope}/` : '';
    const results: vscode.Uri[] = [];
    const seen = new Set<string>();

    for (const recursivePattern of recursiveFindPatterns(page)) {
        const pattern = new vscode.RelativePattern(
            workspaceFolder,
            `${prefix}${recursivePattern}`,
        );
        const files = await vscode.workspace.findFiles(pattern, FIND_FILES_EXCLUDE, FIND_FILES_LIMIT);
        for (const file of files) {
            const key = file.fsPath;
            if (!seen.has(key)) {
                seen.add(key);
                results.push(file);
            }
        }
    }

    return results;
}
