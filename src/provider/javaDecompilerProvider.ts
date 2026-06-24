
import * as vscode from "vscode";
import { readUriText } from "@/common/workspaceFs";

export class JavaDecompilerProvider implements vscode.TextDocumentContentProvider {
    onDidChange?: vscode.Event<vscode.Uri>;
    provideTextDocumentContent(uri: vscode.Uri, token: vscode.CancellationToken): vscode.ProviderResult<string> {
        return readUriText(uri);
    }

}
