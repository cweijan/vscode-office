import * as vscode from 'vscode';
import { JavaDecompilerProvider } from './provider/javaDecompilerProvider';
import { MarkdownEditorProvider } from './provider/markdownEditorProvider';
import { OfficeViewerProvider } from './provider/officeViewerProvider';
import { HtmlService } from './service/htmlService';
import { MarkdownService } from './service/markdownService';
import { Output } from './common/Output';
import { FileUtil } from './common/fileUtil';
import { ReactApp } from './common/reactApp';
const httpExt = require('./bundle/extension');

export function activate(context: vscode.ExtensionContext) {
	keepOriginDiff();
	activeHTTP(context)
	const viewOption = { webviewOptions: { retainContextWhenHidden: true, enableFindWidget: true } };
	FileUtil.init(context)
	ReactApp.init(context)
	const markdownService = new MarkdownService(context);
	const viewerInstance = new OfficeViewerProvider(context);
	context.subscriptions.push(
		vscode.commands.registerCommand('office.quickOpen', () => vscode.commands.executeCommand('workbench.action.quickOpen')),
		vscode.commands.registerCommand('office.markdown.switch', (uri) => { markdownService.switchEditor(uri) }),
		vscode.commands.registerCommand('office.markdown.paste', () => { markdownService.loadClipboardImage() }),
		vscode.commands.registerCommand('office.html.preview', uri => HtmlService.previewHtml(uri, context)),
		vscode.workspace.registerTextDocumentContentProvider('decompile_java', new JavaDecompilerProvider()),
		vscode.window.registerCustomEditorProvider("cweijan.markdownViewer", new MarkdownEditorProvider(context), viewOption),
		...viewerInstance.bindCustomEditors(viewOption)
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

/**
 * Git History是生成一个临时文件, 因此这里无法控制
 */
function keepOriginDiff() {
	const config = vscode.workspace.getConfiguration("workbench");
	const configKey = 'editorAssociations'
	const editorAssociations = config.get(configKey)
	const key = '{git,gitlens,git-graph}:/**/*.{md,csv,svg}'
	if (!editorAssociations[key]) {
		const oldKey = '{git,gitlens}:/**/*.{md,csv,svg}'
		editorAssociations[oldKey] = undefined
		editorAssociations[key] = 'default'
		config.update(configKey, editorAssociations, true)
	}
}