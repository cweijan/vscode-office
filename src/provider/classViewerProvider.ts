import { getExtensionResourceRoots } from '@/common/extensionResource';
import { handleClass } from '@/provider/handlers/classHandler';
import * as vscode from 'vscode';

/**
 * Desktop-only Java decompiler custom editor (`cweijan.classViewer`).
 */
export class ClassViewerProvider implements vscode.CustomReadonlyEditorProvider {

	constructor(private context: vscode.ExtensionContext) { }

	bindCustomEditor(viewOption: { webviewOptions: vscode.WebviewPanelOptions }) {
		return vscode.window.registerCustomEditorProvider('cweijan.classViewer', this, viewOption);
	}

	openCustomDocument(uri: vscode.Uri): vscode.CustomDocument {
		return { uri, dispose: (): void => { } };
	}

	resolveCustomEditor(document: vscode.CustomDocument, webviewPanel: vscode.WebviewPanel): void {
		const folderPath = vscode.Uri.joinPath(document.uri, '..');
		webviewPanel.webview.options = {
			enableScripts: true,
			localResourceRoots: [...getExtensionResourceRoots(this.context), folderPath],
		};
		handleClass(document.uri, webviewPanel);
	}
}
