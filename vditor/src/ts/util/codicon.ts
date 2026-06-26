export const codicon = (name: string, className = "") =>
    `<span class="codicon codicon-${name}${className ? ` ${className}` : ""}" aria-hidden="true"></span>`;

/** codicon 无 undo，用 redo 水平镜像 */
export const codiconUndo = (className = "") =>
    `<span class="codicon codicon-redo vditor-codicon-undo${className ? ` ${className}` : ""}" aria-hidden="true"></span>`;

/** codicon 无 outdent，用 indent 水平镜像 */
export const codiconOutdent = (className = "") =>
    `<span class="codicon codicon-indent vditor-codicon-outdent${className ? ` ${className}` : ""}" aria-hidden="true"></span>`;

const TOOLBAR_CODICONS: Record<string, string> = {
    headings: "text-size",
    bold: "bold",
    italic: "italic",
    strike: "strikethrough",
    "font-color": "symbol-color",
    link: "link",
    list: "list-unordered",
    "ordered-list": "list-ordered",
    check: "tasklist",
    outdent: "__outdent__",
    indent: "indent",
    quote: "quote",
    line: "horizontal-rule",
    code: "code",
    "inline-code": "symbol-text",
    "insert-before": "arrow-up",
    "insert-after": "arrow-down",
    upload: "cloud-upload",
    table: "table",
    undo: "__undo__",
    redo: "redo",
    more: "ellipsis",
    "edit-mode": "edit",
    outline: "list-tree",
    "editor-theme": "color-mode",
    "code-theme": "file-code",
    "ai-settings": "sparkle",
    settings: "settings-gear",
    info: "info",
    help: "question",
    find: "search",
};

export const TABLE_CODICONS = {
    add: "add",
    alignLeft: "layout-panel-left",
    alignCenter: "layout-panel-center",
    alignRight: "layout-panel-right",
    insertRowBelow: "run-below",
    insertRowAbove: "run-above",
    insertColumnRight: "arrow-right",
    insertColumnLeft: "arrow-left",
    deleteRow: "trash",
    deleteColumn: "trash",
} as const;

export const getToolbarCodicon = (name: string): string => {
    const icon = TOOLBAR_CODICONS[name];
    if (icon === "__undo__") {
        return codiconUndo();
    }
    if (icon === "__outdent__") {
        return codiconOutdent();
    }
    return icon ? codicon(icon) : "";
};
