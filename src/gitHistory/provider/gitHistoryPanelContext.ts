import * as vscode from 'vscode';

export interface GitHistoryPanelContext {
    readonly fileUri?: vscode.Uri;
    /** Explicit repo root from SCM or command context; takes priority over saved state. */
    readonly preferredRepo?: string;
}

export function getPanelKey(fileUri?: vscode.Uri): string {
    return fileUri?.toString() ?? '';
}

export interface GitHistoryPanelSerializedState {
    fileUri?: string;
}
