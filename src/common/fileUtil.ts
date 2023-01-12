import { existsSync, mkdirSync } from 'fs';
import { dirname, parse } from 'path';
import * as vscode from 'vscode';

export function wrieteFile(path: string, buffer: Buffer) {
    const dir = dirname(path)
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
    }
    vscode.workspace.fs.writeFile(vscode.Uri.file(path), buffer);
}

export function adjustImgPath(uri: vscode.Uri, withworkspace: boolean = false) {
    let imgPath = vscode.workspace.getConfiguration("vscode-office").get<string>("pasterImgPath")
        .replace("${fileName}", parse(uri.fsPath).name.replace(/\s/g, ''))
        .replace("${now}", new Date().getTime() + "")
    return {
        relPath: imgPath.replace(/\$\{workspaceDir\}\/?/, ''),
        fullPath: imgPath.replace("${workspaceDir}", getWorkspacePath(uri))

    };
}

/**
 * 根据uri获取其工作空间路径
 * @param uri 
 * @returns 
 */
export function getWorkspacePath(uri: vscode.Uri): string {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length == 0) return '';
    let workspacePath = folders[0]?.uri?.fsPath;
    if (folders.length > 1) {
        for (const folder of folders) {
            if (uri.fsPath.includes(folder.uri.fsPath)) {
                return folder.uri.fsPath;
            }
        }
    }
    return workspacePath;
}