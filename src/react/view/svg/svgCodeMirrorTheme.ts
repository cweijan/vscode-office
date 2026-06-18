import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import { tags as t } from '@lezer/highlight';

export const svgEditorTheme = EditorView.theme({
    '&': {
        height: '100%',
        color: 'var(--vscode-editor-foreground, #cccccc)',
        backgroundColor: 'var(--vscode-editor-background, #1e1e1e)',
    },
    '&.cm-focused': {
        outline: 'none',
    },
    '.cm-scroller': {
        overflow: 'auto',
        fontFamily: 'var(--vscode-editor-font-family, Menlo, Monaco, "Courier New", monospace)',
        fontSize: 'var(--vscode-editor-font-size, 13px)',
        lineHeight: '1.55',
    },
    '.cm-content': {
        padding: '14px 0',
        caretColor: 'var(--vscode-editorCursor-foreground, #aeafad)',
    },
    '&.cm-lineWrapping .cm-line': {
        whiteSpace: 'break-spaces',
        wordBreak: 'break-word',
    },
    '.cm-gutters': {
        backgroundColor: 'var(--vscode-editor-background, #1e1e1e)',
        color: 'var(--vscode-editorLineNumber-foreground, #858585)',
        borderRight: '1px solid var(--vscode-editorWidget-border, #454545)',
    },
    '.cm-activeLineGutter': {
        backgroundColor: 'var(--vscode-editor-lineHighlightBackground, rgba(255, 255, 255, 0.04))',
    },
    '.cm-activeLine': {
        backgroundColor: 'var(--vscode-editor-lineHighlightBackground, rgba(255, 255, 255, 0.04))',
    },
    '.cm-selectionBackground': {
        backgroundColor: 'var(--vscode-editor-selectionBackground, #264f78) !important',
    },
    '&.cm-focused .cm-selectionBackground': {
        backgroundColor: 'var(--vscode-editor-selectionBackground, #264f78) !important',
    },
    '.cm-cursor': {
        borderLeftColor: 'var(--vscode-editorCursor-foreground, #aeafad)',
    },
    '.cm-matchingBracket': {
        backgroundColor: 'var(--vscode-editorBracketMatch-background, rgba(0, 100, 0, 0.1))',
        outline: '1px solid var(--vscode-editorBracketMatch-border, #888)',
    },
}, { dark: true });

const svgHighlightStyle = HighlightStyle.define([
  // entity.name.tag
    { tag: t.tagName, color: 'var(--vscode-debugConsole-errorForeground, #f97583)' },
  // entity.other.attribute-name
    { tag: t.attributeName, color: 'var(--vscode-gitDecoration-modifiedResourceForeground, #ffab70)' },
  // string.quoted
    { tag: [t.attributeValue, t.string], color: 'var(--vscode-gitDecoration-addedResourceForeground, #85e89d)' },
    { tag: t.comment, color: 'var(--vscode-debugTokenExpression-number, #6a9955)', fontStyle: 'italic' },
    { tag: t.processingInstruction, color: 'var(--vscode-descriptionForeground, #808080)' },
    { tag: [t.bracket, t.punctuation, t.operator], color: 'var(--vscode-editor-foreground, #cccccc)' },
]);

export const svgSyntaxHighlighting = syntaxHighlighting(svgHighlightStyle);
