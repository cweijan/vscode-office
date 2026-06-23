import { dirname, parse } from 'path';
import * as vscode from 'vscode';
import { ensureParentDirectory } from './workspaceFs';
import { Global } from './global';

export async function writeFile(path: string, buffer: Uint8Array) {
    const uri = vscode.Uri.file(path);
    await ensureParentDirectory(uri);
    await vscode.workspace.fs.writeFile(uri, buffer);
}

export function adjustImgPath(uri: vscode.Uri, ext: string = 'png') {
    const now = new Date();
    const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const uuid = crypto.randomUUID().replace(/-/g, '');
    const imgPath = Global.getConfig<string>("pasterImgPath")
        .replace("${fileName}", parse(uri.fsPath).name.replace(/\s/g, ''))
        .replace("${now}", now.getTime() + "")
        .replace("${date}", date)
        .replace("${uuid}", uuid)
        .replace("${ext}", ext)
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
    const workspacePath = folders[0]?.uri?.fsPath;
    if (folders.length > 1) {
        for (const folder of folders) {
            if (uri.fsPath.includes(folder.uri.fsPath)) {
                return folder.uri.fsPath;
            }
        }
    }
    return workspacePath;
}

export class FileUtil {
    private static context: vscode.ExtensionContext;
    public static init(context: vscode.ExtensionContext) {
        this.context = context;
    }
    public static async getLastPath(key: string | string[], path = '') {
        // 获取已经保存的路径
        let basePath: string;
        if (!Array.isArray(key)) { key = [key] }
        for (const itemKey of key) {
            basePath = this.context.globalState.get(itemKey + 'SelectorPath');
            if (basePath) break;
        }
        if (basePath) {
            const baseUri = vscode.Uri.file(basePath);
            try {
                await vscode.workspace.fs.stat(baseUri);
            } catch {
                basePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
            }
        } else {
            basePath = '';
        }
        return vscode.Uri.file(basePath + path);
    }
}
