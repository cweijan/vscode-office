import { FilePermission, Uri, workspace } from 'vscode';

/** 非 file 协议或文件系统标记为只读时返回 true */
export async function isUriReadOnly(uri: Uri): Promise<boolean> {
    if (uri.scheme !== 'file') {
        return true;
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
