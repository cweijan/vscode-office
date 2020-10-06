import * as vscode from 'vscode';
import { OfficeEditor } from './officeEditor';

export function activate(context: vscode.ExtensionContext) {

	const viewOption = { webviewOptions: { retainContextWhenHidden: true } };
	vscode.window.registerCustomEditorProvider("cweijan.viewOffice", new OfficeEditor(context), viewOption);

}

export function deactivate() { }
