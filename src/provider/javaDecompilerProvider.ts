
import { readFileSync } from "fs";
import * as vscode from "vscode";

export class JavaDecompilerProvider implements vscode.TextDocumentContentProvider {
    onDidChange?: vscode.Event<vscode.Uri>;
    provideTextDocumentContent(uri: vscode.Uri, token: vscode.CancellationToken): vscode.ProviderResult<string> {
        return readFileSync(uri.fsPath, 'utf8')
    }

}