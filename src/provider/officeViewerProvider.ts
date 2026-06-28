import { ReactApp } from '@/common/reactApp';
import { getFileSuffix } from '@/common/fileSuffix';
import * as vscode from 'vscode';
import { Handler } from '../common/handler';
import { Util } from '../common/util';
import { handleImage, isImage } from './handlers/imageHanlder';
import { handleSvg } from './handlers/svgHandler';
import { isVirtualUri, readUriText } from './handlers/officeContent';
import { handleCommonEvent } from './compress/commonHandler';
import { TelemetryService } from '@/service/telemetryService';
import { extensionResource, getExtensionResourceRoots, readExtensionText } from '@/common/extensionResource';

/**
 * support view office files
 */
export class OfficeViewerProvider implements vscode.CustomReadonlyEditorProvider {

	constructor(private context: vscode.ExtensionContext) { }

	bindCustomEditors(viewOption: { webviewOptions: vscode.WebviewPanelOptions }) {
		return [
			vscode.window.registerCustomEditorProvider('cweijan.officeViewer', this, viewOption),
			vscode.window.registerCustomEditorProvider('cweijan.imageViewer', this, viewOption),
		];
	}

	public openCustomDocument(uri: vscode.Uri, openContext: vscode.CustomDocumentOpenContext, token: vscode.CancellationToken): vscode.CustomDocument | Thenable<vscode.CustomDocument> {
		return { uri, dispose: (): void => { } };
	}
	public async resolveCustomEditor(document: vscode.CustomDocument, webviewPanel: vscode.WebviewPanel, token: vscode.CancellationToken): Promise<void> {
		const uri = document.uri;
		const suffix = getFileSuffix(uri.fsPath);
		const isDocx = ['.docx', '.dotx'].includes(suffix);
		if (isDocx) {
			const disableDocxDiffHistoryPreview = vscode.workspace.getConfiguration('vscode-office').get<boolean>('disableDocxDiffHistoryPreview', true);
			if (disableDocxDiffHistoryPreview) {
				const isDiff = ['git', 'gitlens', 'gitlens-git', 'vscode-local-history', 'review'].includes(uri.scheme);
				if (isDiff) {
					// Delay to let VS Code finish setting up the diff tab
					setTimeout(() => {
						vscode.commands.executeCommand('workbench.action.reopenTextEditor');
					}, 300);
					return;
				}
			}
		}
		const webview = webviewPanel.webview;
		const folderPath = vscode.Uri.joinPath(uri, '..');
		webview.options = {
			enableScripts: true,
			localResourceRoots: [...getExtensionResourceRoots(this.context), folderPath],
		};

		const handler = Handler.bind(webviewPanel, uri);

		let route: string;
		const isSvg = /\.svg$/i.test(suffix);
		handleCommonEvent(uri, handler, isSvg ? { skipOpen: true } : undefined);
		if (isSvg) {
			route = 'svg';
			handleSvg(handler, uri);
		} else if (isImage(suffix)) {
			handleImage(handler, uri, webview);
			route = 'image';
		}
		switch (suffix) {
			case '.xlsx':
			case '.xlsm':
			case '.xls':
			case '.csv':
			case '.tsv':
			case '.ods':
				route = 'excel';
				break;
			case '.docx':
			case '.dotx':
				route = 'word';
				break;
			case '.pptx':
			case '.pptm':
				route = 'ppt';
				break;
			case '.ttf':
			case '.woff':
			case '.woff2':
			case '.otf':
				route = 'font';
				break;
			case '.pdf':
				void this.loadPdfViewer(webview);
				break;
			case '.epub':
				route = 'epub';
				break;
			case '.icns':
				route = 'icns';
				break;
			case '.psd':
				route = 'psd';
				break;
			case '.xmind':
				route = 'xmind';
				break;
			case '.htm':
			case '.html':
				if (isVirtualUri(uri)) {
					void this.loadVirtualHtml(webviewPanel, uri, folderPath);
				} else {
					void this.loadWorkspaceHtml(webviewPanel, uri, folderPath);
				}
				break;
			default:
				if (route) break;
				vscode.commands.executeCommand('vscode.openWith', uri, 'default');
		}
		const fileType = suffix.startsWith('.') ? suffix.slice(1) : suffix;
		TelemetryService.get()?.trackOfficeViewOpen(uri.fsPath, route, fileType);
		if (route) return ReactApp.view(webview, { route });
	}

	private async loadPdfViewer(webview: vscode.Webview) {
		const html = await readExtensionText(this.context, 'resource', 'pdf', 'viewer.html');
		webview.html = html.replace('{{baseUrl}}', this.getBaseUrl(webview, 'pdf'));
	}

	private async loadWorkspaceHtml(webviewPanel: vscode.WebviewPanel, uri: vscode.Uri, folderPath: vscode.Uri) {
		const webview = webviewPanel.webview;
		const render = async () => {
			const content = await readUriText(uri);
			webview.html = Util.buildPath(content, webview, folderPath);
		};
		await render();
		Util.listen(webviewPanel, uri, () => {
			void render();
		});
	}

	private async loadVirtualHtml(webviewPanel: vscode.WebviewPanel, uri: vscode.Uri, folderPath: vscode.Uri) {
		try {
			const content = await readUriText(uri);
			webviewPanel.webview.html = Util.buildPath(content, webviewPanel.webview, folderPath);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Failed to read HTML';
			webviewPanel.webview.html = `<pre>${message}</pre>`;
		}
	}

	private getBaseUrl(webview: vscode.Webview, path: string) {
		const baseUrl = webview.asWebviewUri(extensionResource(this.context, 'resource', path))
			.toString().replace(/\?.+$/, '').replace('https://git', 'https://file');
		return baseUrl;
	}

}
