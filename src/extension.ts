import * as vscode from 'vscode';
import { JavaDecompilerProvider } from './provider/javaDecompilerProvider';
import { OfficeEditorProvider } from './provider/officeEditorProvider';
import { OfficeViewerProvider } from './provider/officeViewerProvider';
import { HtmlService } from './service/htmlService';
import { MarkdownService } from './service/markdownService';


export function activate(context: vscode.ExtensionContext) {

	require('./bundle/http').activateHttp(context)

	const viewOption = { webviewOptions: { retainContextWhenHidden: true, enableFindWidget: true } };
	const markdownService = new MarkdownService(context);
	context.subscriptions.push(
		vscode.commands.registerCommand('office.markdown.paste', () => { markdownService.loadClipboardImage(vscode.window.activeTextEditor?.document) }),
		vscode.commands.registerCommand('office.html.preview', HtmlService.previewHtml),
		vscode.workspace.registerTextDocumentContentProvider('decompile_java', new JavaDecompilerProvider()),
		vscode.window.registerCustomEditorProvider("cweijan.viewOffice", new OfficeViewerProvider(context), viewOption),
		vscode.window.registerCustomEditorProvider("cweijan.viewHtml", new OfficeViewerProvider(context), viewOption),
		vscode.window.registerCustomEditorProvider("cweijan.viewMarkdown", new OfficeEditorProvider(context), viewOption)
	);

}

export function deactivate() { }