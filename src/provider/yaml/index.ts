import { ExtensionContext, languages } from 'vscode';
import { YamlDefinitionProvider } from './providers/yamlDefinitionProvider';
import { YamlDocumentSymbolProvider } from './providers/yamlDocumentSymbolProvider';

const documentSelector = [{ language: 'yaml', scheme: '*' }];

export function activateYaml(context: ExtensionContext): void {
    context.subscriptions.push(
        languages.registerDocumentSymbolProvider(documentSelector, new YamlDocumentSymbolProvider()),
        languages.registerDefinitionProvider(documentSelector, new YamlDefinitionProvider()),
    );
}
