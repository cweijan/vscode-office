import * as vscode from 'vscode';
import { IconService } from './iconService';

export { resolveFileIcon, resolveFolderIcon } from './iconTheme';
export type { IconMaps } from './iconTheme';

export function getIconFileName(fileName: string): string {
    return IconService.getInstance().resolveFile(fileName);
}

export function getIconUri(context: vscode.ExtensionContext, fileName: string): vscode.Uri {
    return IconService.getInstance().getFileIconUri(context, fileName);
}
