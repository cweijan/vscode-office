import * as vscode from 'vscode';
import { JavaDecompilerProvider } from './provider/javaDecompilerProvider';
import { OfficeEditorProvider } from './provider/officeEditorProvider';
import { OfficeViewerProvider } from './provider/officeViewerProvider';
import { HtmlService } from './service/htmlService';
import { MarkdownService } from './service/markdownService';
const httpExt = require('./bundle/extension');

export function activate(context: vscode.ExtensionContext) {

	httpExt.activate(context)

	const viewOption = { webviewOptions: { retainContextWhenHidden: true, enableFindWidget: true } };
	const markdownService = new MarkdownService(context);
	const viewerInstance = new OfficeViewerProvider(context);
	context.subscriptions.push(
		vscode.commands.registerCommand('office.markdown.paste', () => { markdownService.loadClipboardImage() }),
		vscode.commands.registerCommand('office.html.preview', HtmlService.previewHtml),
		vscode.workspace.registerTextDocumentContentProvider('decompile_java', new JavaDecompilerProvider()),
		vscode.window.registerCustomEditorProvider("cweijan.markdownViewer", new OfficeEditorProvider(context), viewOption),
		vscode.window.registerCustomEditorProvider("cweijan.officeViewer", viewerInstance, viewOption),
		vscode.window.registerCustomEditorProvider("cweijan.htmlViewer", viewerInstance, viewOption),
		vscode.window.registerCustomEditorProvider("cweijan.classViewer", viewerInstance, viewOption),
	);
}

export function deactivate() { }