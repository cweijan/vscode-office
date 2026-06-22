import * as vscode from 'vscode';
import { TelemetryService } from './service/telemetryService';
import { JavaDecompilerProvider } from './provider/javaDecompilerProvider';
import { MarkdownEditorProvider } from './provider/markdownEditorProvider';
import { OfficeViewerProvider } from './provider/officeViewerProvider';
import { HtmlService } from './service/htmlService';
import { MarkdownService } from './service/markdownService';
import { FileUtil } from './common/fileUtil';
import { ReactApp } from './common/reactApp';
import { activateHttp } from './provider/http';
import { activateYaml } from './provider/yaml';
import { activateXml } from './provider/xml';
import { activateGitHistory } from './gitHistory/provider';

export function activate(context: vscode.ExtensionContext) {
	TelemetryService.init(context);
	activateHttp(context);
	activateYaml(context);
	activateXml(context);
	activateGitHistory(context);
	const mdViewOption = { webviewOptions: { retainContextWhenHidden: true } };
	const viewOption = { webviewOptions: { retainContextWhenHidden: true, enableFindWidget: true } };
	FileUtil.init(context)
	ReactApp.init(context)
	const markdownService = new MarkdownService(context);
	const viewerInstance = new OfficeViewerProvider(context);
	const markdownEditorProvider = new MarkdownEditorProvider(context)
	context.subscriptions.push(
		vscode.commands.registerCommand('office.markdown.switch', (uri) => { markdownService.switchEditor(uri) }),
		vscode.commands.registerCommand('office.markdown.paste', () => { markdownService.loadClipboardImage() }),
		vscode.commands.registerCommand('office.html.preview', uri => HtmlService.previewHtml(uri, context)),
		vscode.workspace.registerTextDocumentContentProvider('decompile_java', new JavaDecompilerProvider()),
		vscode.window.registerCustomEditorProvider("cweijan.markdownViewer", markdownEditorProvider, mdViewOption),
		vscode.window.registerCustomEditorProvider("cweijan.markdownPreview", markdownEditorProvider, mdViewOption),
		...viewerInstance.bindCustomEditors(viewOption)
	);
}

export function deactivate() { }