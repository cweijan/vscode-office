import * as vscode from 'vscode';
import * as path from 'path';

// const sudo = require('sudo-prompt');
// const REG_JUMP_BIN = `${path.resolve(__dirname, '../bin/regjump.exe')} "{key}"`;
// const sudoOptions = {
//     name: 'RegJump'
// };
import { OfficeEditor } from './officeEditor';
import { MarkdownService } from './markdownService';
import { MarkdownEditor } from './markdownEditor';
import { activateHttp } from './http/http';
import { basename, resolve } from 'path';
import { Util } from './common/util';
import { readFileSync, utimes } from 'fs';

export function activate(context: vscode.ExtensionContext) {

	const viewOption = { webviewOptions: { retainContextWhenHidden: true, enableFindWidget: true} };
	const markdownService = new MarkdownService(context);
	context.subscriptions.push(
		vscode.commands.registerTextEditorCommand('office.reg.jumpToKey', () => { }),
		vscode.commands.registerCommand('office.markdown.paste', () => {
			markdownService.loadClipboardImage(vscode.window.activeTextEditor?.document)
		}),
		vscode.commands.registerCommand('office.html.preview', (uri: vscode.Uri) => {
			if (!uri) {
				uri = vscode.window.activeTextEditor.document.uri
			}
			const folderPath = vscode.Uri.file(resolve(uri.fsPath, ".."));
			const webviewPanel=vscode.window.createWebviewPanel("cwejan.viewHtml", basename(uri.fsPath), { viewColumn: vscode.ViewColumn.Two, preserveFocus: true },{enableScripts:true})
			webviewPanel.webview.html = Util.buildPath(readFileSync(uri.fsPath, 'utf8'), webviewPanel.webview, folderPath.fsPath);
			Util.listen(webviewPanel,uri,()=>{
				webviewPanel.webview.html = Util.buildPath(readFileSync(uri.fsPath, 'utf8'), webviewPanel.webview, folderPath.fsPath);
			})
		})
	);
	activateHttp(context)
	vscode.window.registerCustomEditorProvider("cweijan.viewOffice", new OfficeEditor(context), viewOption);
	vscode.window.registerCustomEditorProvider("cweijan.viewHtml", new OfficeEditor(context), viewOption);
	vscode.window.registerCustomEditorProvider("cweijan.viewMarkdown", new MarkdownEditor(context), viewOption);

}

export function deactivate() { }


// function jumpToRegKey(textEditor: vscode.TextEditor, edit: vscode.TextEditorEdit) {
//     textEditor.selections.forEach(function (selection: vscode.Selection) {
//         var document = textEditor.document;
//         var line = document.lineAt(selection.anchor);
//         var text = textEditor.document.getText(line.range);
//         var regMatches = text.match(/\[(.*?)\]/);

//         if (regMatches) {
//             var command = REG_JUMP_BIN.replace("{key}", regMatches[1]);

//             sudo.exec(command, sudoOptions, function (err: any, stdout: any, stderr: any) {
//                 if (err) {
//                     console.log(err);
//                     vscode.window.showErrorMessage(`RegJump faild, ${err}`);
//                     return;
//                 }
//             });
//         }
//     });
// }