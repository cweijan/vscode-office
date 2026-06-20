import {EditorView} from "@codemirror/view";

/** CodeMirror 布局与字体（配色由 css/codemirror.css 控制） */
export const vditorEditorTheme = EditorView.theme({
    "&": {
        borderRadius: "6px",
        overflow: "hidden",
    },
    "&.cm-focused": {
        outline: "none",
    },
    ".cm-scroller": {
        overflow: "auto",
        fontFamily: "var(--vscode-editor-font-family, ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace)",
        fontSize: "var(--vscode-editor-font-size, 13px)",
        fontWeight: "var(--vscode-editor-font-weight, normal)",
        fontFeatureSettings: "\"liga\" 0, \"calt\" 0",
        fontVariantLigatures: "none",
        lineHeight: "calc(var(--vscode-editor-font-size, 13px) * 1.35)",
    },
    ".cm-content": {
        padding: "8px 0",
    },
    ".cm-line": {
        padding: "0 12px 0 4px",
    },
    ".cm-gutter.cm-lineNumbers .cm-gutterElement": {
        minWidth: "3ch",
        padding: "0 12px 0 8px",
        textAlign: "right",
        fontFamily: "inherit",
        fontSize: "inherit",
        fontWeight: "normal",
        lineHeight: "inherit",
    },
    ".cm-gutter.cm-foldGutter .cm-gutterElement": {
        padding: "0 4px",
    },
    ".cm-cursor, .cm-dropCursor": {
        borderLeftWidth: "2px",
    },
    "&.cm-lineWrapping .cm-line": {
        whiteSpace: "break-spaces",
        wordBreak: "break-word",
    },
});
