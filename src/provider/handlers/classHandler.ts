import * as vscode from 'vscode';
import { openDecompiledClass } from '@/provider/javaDecompilerProvider';

export function handleClass(uri: vscode.Uri, _panel: vscode.WebviewPanel): void {
    void openDecompiledClass(uri.fsPath);
}
