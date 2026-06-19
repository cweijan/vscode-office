import {
    CancellationToken,
    DocumentFormattingEditProvider,
    DocumentRangeFormattingEditProvider,
    FormattingOptions,
    ProviderResult,
    Range,
    TextDocument,
    TextEdit,
} from 'vscode';
import { formatXml } from '../utils/xmlFormat';

export class XmlDocumentFormattingEditProvider implements DocumentFormattingEditProvider {
    provideDocumentFormattingEdits(
        document: TextDocument,
        options: FormattingOptions,
        _token: CancellationToken,
    ): ProviderResult<TextEdit[]> {
        const formatted = formatXml(document.getText(), options);
        if (formatted === document.getText()) {
            return [];
        }
        const fullRange = new Range(
            document.positionAt(0),
            document.positionAt(document.getText().length),
        );
        return [TextEdit.replace(fullRange, formatted)];
    }
}

export class XmlDocumentRangeFormattingEditProvider implements DocumentRangeFormattingEditProvider {
    provideDocumentRangeFormattingEdits(
        document: TextDocument,
        range: Range,
        options: FormattingOptions,
        _token: CancellationToken,
    ): ProviderResult<TextEdit[]> {
        const text = document.getText(range);
        const formatted = formatXml(text, options);
        if (formatted === text) {
            return [];
        }
        return [TextEdit.replace(range, formatted)];
    }
}
