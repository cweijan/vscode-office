import { ReactApp } from '@/common/reactApp';
import { getFileSuffix } from '@/common/fileSuffix';
import { Handler } from '@/common/handler';
import { getExtensionResourceRoots } from '@/common/extensionResource';
import { handleCommonEvent } from '@/provider/compress/commonHandler';
import { handleZip } from '@/provider/compress/zipHandler';
import { handleRar } from '@/provider/compress/rarHandler';
import { handleTarGz } from '@/provider/compress/tarHandler';
import { handleSevenZip } from '@/provider/compress/sevenZipHandler';
import { TelemetryService } from '@/service/telemetryService';
import * as vscode from 'vscode';

/**
 * Desktop-only archive preview (zip, 7z, rar, tar, etc.).
 * Kept separate from {@link OfficeViewerProvider} so web builds do not pull compress dependencies.
 */
export class ArchiveViewerProvider implements vscode.CustomReadonlyEditorProvider {

	constructor(private context: vscode.ExtensionContext) { }

	bindCustomEditor(viewOption: { webviewOptions: vscode.WebviewPanelOptions }) {
		return vscode.window.registerCustomEditorProvider('cweijan.archiveViewer', this, viewOption);
	}

	public openCustomDocument(uri: vscode.Uri, _openContext: vscode.CustomDocumentOpenContext, _token: vscode.CancellationToken): vscode.CustomDocument {
		return { uri, dispose: (): void => { } };
	}

	public resolveCustomEditor(document: vscode.CustomDocument, webviewPanel: vscode.WebviewPanel, _token: vscode.CancellationToken): void {
		const uri = document.uri;
		const webview = webviewPanel.webview;
		const folderPath = vscode.Uri.joinPath(uri, '..');
		webview.options = {
			enableScripts: true,
			localResourceRoots: [...getExtensionResourceRoots(this.context), folderPath],
		};

		const handler = Handler.bind(webviewPanel, uri);
		const suffix = getFileSuffix(uri.fsPath);
		handleCommonEvent(uri, handler);

		switch (suffix) {
			case '.zip':
			case '.jar':
			case '.apk':
			case '.vsix':
			case '.crx':
				void handleZip(uri, handler);
				break;
			case '.7z':
				void handleSevenZip(uri, handler);
				break;
			case '.rar':
				void handleRar(uri, handler);
				break;
			case '.tar.gz':
				void handleTarGz(uri, handler, true);
				break;
			case '.tar':
				void handleTarGz(uri, handler, false);
				break;
			default:
				vscode.commands.executeCommand('vscode.openWith', uri, 'default');
				return;
		}

		const fileType = suffix.startsWith('.') ? suffix.slice(1) : suffix;
		TelemetryService.get()?.trackOfficeViewOpen(uri.fsPath, 'zip', fileType);
		void ReactApp.view(webview, { route: 'zip' });
	}
}
