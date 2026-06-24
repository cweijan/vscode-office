import { basename } from 'path';
import { ReactApp } from '@/common/reactApp';
import { getExtensionResourceRoots } from '@/common/extensionResource';
import * as vscode from 'vscode';

/** Existing package.json viewTypes that are desktop-only; on web show the unsupported screen instead. */
const WEB_UNSUPPORTED_VIEW_TYPES = [
	'cweijan.archiveViewer',
	'cweijan.classViewer',
] as const;

/**
 * Web-only: registers desktop-only custom editors and routes them to the Office Viewer
 * "web unsupported" screen (no extra package.json contribution).
 */
export class WebUnsupportedViewerProvider implements vscode.CustomReadonlyEditorProvider {

	constructor(private context: vscode.ExtensionContext) { }

	bindCustomEditors(viewOption: { webviewOptions: vscode.WebviewPanelOptions }) {
		const disposables: vscode.Disposable[] = [];
		for (const viewType of WEB_UNSUPPORTED_VIEW_TYPES) {
			disposables.push(vscode.window.registerCustomEditorProvider(viewType, this, viewOption));
		}
		return disposables;
	}

	openCustomDocument(uri: vscode.Uri): vscode.CustomDocument {
		return { uri, dispose: (): void => { } };
	}

	resolveCustomEditor(document: vscode.CustomDocument, webviewPanel: vscode.WebviewPanel): void {
		const webview = webviewPanel.webview;
		const folderPath = vscode.Uri.joinPath(document.uri, '..');
		webview.options = {
			enableScripts: true,
			localResourceRoots: [...getExtensionResourceRoots(this.context), folderPath],
		};
		void ReactApp.view(webview, {
			route: 'webUnsupported',
			fileName: basename(document.uri.fsPath),
		});
	}
}
