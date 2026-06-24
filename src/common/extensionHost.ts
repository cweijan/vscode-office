import * as vscode from 'vscode';

export const EXTENSION_HOST_WEB_CONTEXT = 'office.extensionHost.web';

export function setExtensionHostContext(): void {
    void vscode.commands.executeCommand('setContext', EXTENSION_HOST_WEB_CONTEXT, true);
}
