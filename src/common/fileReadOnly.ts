import { FilePermission, Uri, workspace } from 'vscode';

/** git 协议或本地文件系统标记为只读时返回 true */
export async function isUriReadOnly(uri: Uri): Promise<boolean> {
    if (uri.scheme === 'git') {
        return true;
    }
    if (uri.scheme !== 'file') {
        return false;
    }
    try {
        const stat = await workspace.fs.stat(uri);
        if (stat.permissions != null && (stat.permissions & FilePermission.Readonly)) {
            return true;
        }
    } catch {
        return false;
    }
    return false;
}
