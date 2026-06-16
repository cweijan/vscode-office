import {
    isAlias,
    isMap,
    isScalar,
    isSeq,
    Node,
    Pair,
    parseAllDocuments,
    ParsedNode,
    YAMLMap,
} from 'yaml';
import { DocumentSymbol, Position, Range, SymbolKind, TextDocument } from 'vscode';

export interface YamlAliasRef {
    source: string;
    range: Range;
}

export interface YamlAnchorDef {
    name: string;
    range: Range;
    selectionRange: Range;
}

export interface YamlDocumentModel {
    symbols: DocumentSymbol[];
    anchors: Map<string, YamlAnchorDef>;
    aliases: YamlAliasRef[];
}

const MAP_DISPLAY_KEYS = ['name', 'id', 'key', 'title'];

function offsetRange(document: TextDocument, range: [number, number, number]): Range {
    return new Range(document.positionAt(range[0]), document.positionAt(range[2]));
}

function nodeRange(document: TextDocument, node: { range?: [number, number, number] | null } | null | undefined): Range | undefined {
    if (!node?.range) {
        return undefined;
    }
    return offsetRange(document, node.range);
}

function mergeRanges(a: Range, b: Range): Range {
    const start = a.start.isBefore(b.start) ? a.start : b.start;
    const end = a.end.isAfter(b.end) ? a.end : b.end;
    return new Range(start, end);
}

function keyName(key: Pair['key']): string {
    if (key == null) {
        return '<null>';
    }
    if (isScalar(key)) {
        return String(key.value ?? '');
    }
    if (typeof key === 'string' || typeof key === 'number') {
        return String(key);
    }
    return String(key);
}

function pairKeyRange(document: TextDocument, pair: Pair): Range | undefined {
    const key = pair.key;
    if (isScalar(key) && key.range) {
        return offsetRange(document, key.range);
    }
    if (key && typeof key === 'object' && 'range' in key) {
        const keyRange = (key as ParsedNode).range;
        if (keyRange) {
            return offsetRange(document, keyRange);
        }
    }
    return undefined;
}

function pairRange(document: TextDocument, pair: Pair): Range | undefined {
    const keyRange = pairKeyRange(document, pair);
    const valueRange = pair.value ? nodeRange(document, pair.value as ParsedNode) : undefined;
    if (keyRange && valueRange) {
        return mergeRanges(keyRange, valueRange);
    }
    return keyRange ?? valueRange;
}

function getMapDisplayName(map: YAMLMap): string {
    for (const preferred of MAP_DISPLAY_KEYS) {
        for (const pair of map.items) {
            if (!isScalar(pair.key) || pair.key.value !== preferred) {
                continue;
            }
            if (isScalar(pair.value) && pair.value.value != null) {
                return String(pair.value.value);
            }
        }
    }
    return '[item]';
}

function collectAnchorsAndAliases(
    document: TextDocument,
    node: Node,
    anchors: Map<string, YamlAnchorDef>,
    aliases: YamlAliasRef[],
): void {
    if (isAlias(node)) {
        const range = nodeRange(document, node);
        if (range) {
            aliases.push({ source: node.source, range });
        }
        return;
    }

    if ('anchor' in node && node.anchor) {
        const range = nodeRange(document, node);
        if (range) {
            anchors.set(node.anchor, {
                name: node.anchor,
                range,
                selectionRange: range,
            });
        }
    }

    if (isMap(node)) {
        for (const pair of node.items) {
            if (pair.value) {
                collectAnchorsAndAliases(document, pair.value as Node, anchors, aliases);
            }
        }
        return;
    }

    if (isSeq(node)) {
        for (const item of node.items) {
            if (item) {
                collectAnchorsAndAliases(document, item as Node, anchors, aliases);
            }
        }
    }
}

function createSymbol(
    name: string,
    kind: SymbolKind,
    range: Range,
    selectionRange: Range,
    children: DocumentSymbol[] = [],
): DocumentSymbol {
    const symbol = new DocumentSymbol(name, '', kind, range, selectionRange);
    symbol.children = children;
    return symbol;
}

function buildSymbols(document: TextDocument, node: Node): DocumentSymbol[] {
    if (isMap(node)) {
        const symbols: DocumentSymbol[] = [];
        for (const pair of node.items) {
            const name = keyName(pair.key);
            const children = pair.value ? buildSymbols(document, pair.value as Node) : [];
            const selectionRange = pairKeyRange(document, pair);
            const range = pairRange(document, pair);
            if (!selectionRange || !range) {
                continue;
            }
            symbols.push(createSymbol(
                name,
                children.length > 0 ? SymbolKind.Object : SymbolKind.Field,
                range,
                selectionRange,
                children,
            ));
        }
        return symbols;
    }

    if (isSeq(node)) {
        const symbols: DocumentSymbol[] = [];
        for (let index = 0; index < node.items.length; index++) {
            const item = node.items[index];
            if (!item) {
                continue;
            }
            if (isMap(item)) {
                const displayName = getMapDisplayName(item);
                const children = buildSymbols(document, item as Node);
                const itemRange = nodeRange(document, item);
                if (!itemRange) {
                    continue;
                }
                const name = displayName === '[item]' ? `[${index}]` : displayName;
                symbols.push(createSymbol(
                    name,
                    SymbolKind.Object,
                    itemRange,
                    itemRange,
                    children,
                ));
                continue;
            }
            const itemRange = nodeRange(document, item as ParsedNode);
            if (!itemRange) {
                continue;
            }
            symbols.push(createSymbol(
                `[${index}]`,
                SymbolKind.Variable,
                itemRange,
                itemRange,
            ));
        }
        return symbols;
    }

    return [];
}

function buildDocumentSymbols(document: TextDocument, contents: Node, docIndex: number, docCount: number): DocumentSymbol[] {
    const symbols = buildSymbols(document, contents);
    if (docCount <= 1) {
        return symbols;
    }
    const range = nodeRange(document, contents);
    if (!range) {
        return symbols;
    }
    return [createSymbol(
        `Document ${docIndex + 1}`,
        SymbolKind.Module,
        range,
        range,
        symbols,
    )];
}

export function parseYamlDocument(document: TextDocument): YamlDocumentModel {
    const symbols: DocumentSymbol[] = [];
    const anchors = new Map<string, YamlAnchorDef>();
    const aliases: YamlAliasRef[] = [];

    try {
        const docs = parseAllDocuments(document.getText(), { strict: false, prettyErrors: false });
        if ('empty' in docs && docs.empty) {
            return { symbols, anchors, aliases };
        }

        for (let index = 0; index < docs.length; index++) {
            const doc = docs[index];
            if (!doc.contents) {
                continue;
            }
            const contents = doc.contents as Node;
            symbols.push(...buildDocumentSymbols(document, contents, index, docs.length));
            collectAnchorsAndAliases(document, contents, anchors, aliases);
        }
    } catch {
        return { symbols, anchors, aliases };
    }

    return { symbols, anchors, aliases };
}

export function findAliasAtPosition(position: Position, aliases: YamlAliasRef[]): YamlAliasRef | undefined {
    for (const alias of aliases) {
        if (alias.range.contains(position)) {
            return alias;
        }
    }
    return undefined;
}
