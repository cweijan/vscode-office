import { CancellationToken, Definition, DefinitionProvider, Location, Position, TextDocument } from 'vscode';
import { findAliasAtPosition, parseYamlDocument } from '../utils/yamlDocument';

export class YamlDefinitionProvider implements DefinitionProvider {
    public provideDefinition(document: TextDocument, position: Position, _token: CancellationToken): Definition | undefined {
        const model = parseYamlDocument(document);
        const alias = findAliasAtPosition(position, model.aliases);
        if (!alias) {
            return undefined;
        }

        const anchor = model.anchors.get(alias.source);
        if (!anchor) {
            return undefined;
        }

        return new Location(document.uri, anchor.selectionRange);
    }
}
