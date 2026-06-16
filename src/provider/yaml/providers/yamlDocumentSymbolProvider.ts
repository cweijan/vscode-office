import { CancellationToken, DocumentSymbol, DocumentSymbolProvider, TextDocument } from 'vscode';
import { parseYamlDocument } from '../utils/yamlDocument';

export class YamlDocumentSymbolProvider implements DocumentSymbolProvider {
    public provideDocumentSymbols(document: TextDocument, _token: CancellationToken): DocumentSymbol[] {
        return parseYamlDocument(document).symbols;
    }
}
