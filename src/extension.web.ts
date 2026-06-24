/**
 * Web extension host entry (`package.json#browser`).
 * Desktop-only: HTTP, Git History, clipboard paste, Java decompile, archive viewer.
 */
import * as vscode from 'vscode';
import { FileUtil } from './common/fileUtil';
import { setExtensionHostContext } from './common/extensionHost';
import { ReactApp } from './common/reactApp';
import { MarkdownEditorProvider } from './provider/markdownEditorProvider';
import { OfficeViewerProvider } from './provider/officeViewerProvider';
import { WebUnsupportedViewerProvider } from './provider/webUnsupportedViewerProvider';
import { HtmlService } from './service/htmlService';
import { MarkdownService } from './service/markdownService';
import { switchCsvEditor } from './service/csvService';
import { TelemetryService } from './service/telemetryService';
import { activateXml } from './provider/xml';
import { activateYaml } from './provider/yaml';

export function activate(context: vscode.ExtensionContext) {
	setExtensionHostContext();
	TelemetryService.init(context);
	FileUtil.init(context);
	ReactApp.init(context);
	activateYaml(context);
	activateXml(context);

	const viewOption = { webviewOptions: { retainContextWhenHidden: true } };
	const markdownService = new MarkdownService(context);
	const markdownEditorProvider = new MarkdownEditorProvider(context, { isWeb: true });
	const viewerInstance = new OfficeViewerProvider(context);
	const webUnsupportedViewer = new WebUnsupportedViewerProvider(context);

	context.subscriptions.push(
		vscode.commands.registerCommand('office.markdown.switch', (uri) => { markdownService.switchEditor(uri); }),
		vscode.commands.registerCommand('office.csv.switch', (uri) => { switchCsvEditor(uri); }),
		vscode.commands.registerCommand('office.html.preview', (uri) => HtmlService.previewHtml(uri, context)),
		vscode.window.registerCustomEditorProvider('cweijan.markdownViewer', markdownEditorProvider, viewOption),
		vscode.window.registerCustomEditorProvider('cweijan.markdownPreview', markdownEditorProvider, viewOption),
		...webUnsupportedViewer.bindCustomEditors(viewOption),
		...viewerInstance.bindCustomEditors(viewOption),
	);
}

export function deactivate() { }
