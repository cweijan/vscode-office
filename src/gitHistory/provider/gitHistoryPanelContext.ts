import * as vscode from 'vscode';

export interface GitHistoryPanelContext {
    readonly fileUri?: vscode.Uri;
}

export function getPanelKey(fileUri?: vscode.Uri): string {
    return fileUri?.toString() ?? '';
}

export interface GitHistoryPanelSerializedState {
    fileUri?: string;
}
