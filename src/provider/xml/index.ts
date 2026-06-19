import { ExtensionContext, languages } from 'vscode';
import {
    XmlDocumentFormattingEditProvider,
    XmlDocumentRangeFormattingEditProvider,
} from './providers/xmlDocumentFormattingEditProvider';

const documentSelector = [{ language: 'xml', scheme: '*' }];

export function activateXml(context: ExtensionContext): void {
    context.subscriptions.push(
        languages.registerDocumentFormattingEditProvider(documentSelector, new XmlDocumentFormattingEditProvider()),
        languages.registerDocumentRangeFormattingEditProvider(documentSelector, new XmlDocumentRangeFormattingEditProvider()),
    );
}
