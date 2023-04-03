import * as vscode from 'vscode';
import { autoClearCacheStorage } from './service/autoClearCacheStorage';
import { JavaDecompilerProvider } from './provider/javaDecompilerProvider';
import { MarkdownEditorProvider } from './provider/markdownEditorProvider';
import { OfficeViewerProvider } from './provider/officeViewerProvider';
import { HtmlService } from './service/htmlService';
import { MarkdownService } from './service/markdownService';
import { Output } from './common/Output';
const httpExt = require('./bundle/extension');

export function activate(context: vscode.ExtensionContext) {
	activeHTTP(context)
	autoClearCacheStorage();
	const viewOption = { webviewOptions: { retainContextWhenHidden: true, enableFindWidget: true } };
	const markdownService = new MarkdownService(context);
	const viewerInstance = new OfficeViewerProvider(context);
	context.subscriptions.push(
		vscode.commands.registerCommand('office.markdown.paste', () => { markdownService.loadClipboardImage() }),
		vscode.commands.registerCommand('office.html.preview', uri => HtmlService.previewHtml(uri, context)),
		vscode.workspace.registerTextDocumentContentProvider('decompile_java', new JavaDecompilerProvider()),
		vscode.window.registerCustomEditorProvider("cweijan.markdownViewer", new MarkdownEditorProvider(context), viewOption),
		vscode.window.registerCustomEditorProvider("cweijan.officeViewer", viewerInstance, viewOption),
		vscode.window.registerCustomEditorProvider("cweijan.htmlViewer", viewerInstance, viewOption),
		vscode.window.registerCustomEditorProvider("cweijan.classViewer", viewerInstance, viewOption),
	);
}

export function deactivate() { }

async function activeHTTP(context: vscode.ExtensionContext) {
	try {
		httpExt.activate(context)
	} catch (error) {
		Output.debug(error)
	}
}
