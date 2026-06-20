export const codicon = (name: string, className = "") =>
    `<span class="codicon codicon-${name}${className ? ` ${className}` : ""}" aria-hidden="true"></span>`;

/** codicon 无 undo，用 redo 水平镜像 */
export const codiconUndo = (className = "") =>
    `<span class="codicon codicon-redo vditor-codicon-undo${className ? ` ${className}` : ""}" aria-hidden="true"></span>`;

const TOOLBAR_CODICONS: Record<string, string> = {
    emoji: "smiley",
    headings: "text-size",
    bold: "bold",
    italic: "italic",
    strike: "strikethrough",
    link: "link",
    list: "list-unordered",
    "ordered-list": "list-ordered",
    check: "tasklist",
    indent: "indent",
    quote: "quote",
    line: "horizontal-rule",
    code: "code",
    "inline-code": "symbol-text",
    upload: "cloud-upload",
    table: "table",
    undo: "__undo__",
    redo: "redo",
    more: "ellipsis",
    "edit-mode": "edit",
    outline: "list-tree",
    "editor-theme": "color-mode",
    "code-theme": "file-code",
    info: "info",
    help: "question",
};

export const getToolbarCodicon = (name: string) => {
    const icon = TOOLBAR_CODICONS[name];
    if (icon === "__undo__") {
        return codiconUndo();
    }
    return icon ? codicon(icon) : undefined;
};
