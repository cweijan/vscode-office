import { isIdeCodeHtml, isMarkdownLikePlain } from "./processCode";

const inlineHTMLTagInPlain = /<\/[a-zA-Z][\w:-]*>|<[a-zA-Z][\w:-]*(?:\s[^>]*)?\/?>/;

/**
 * 粘贴前在 HTML / plain 之间选路。
 *
 * 1. VS Code（vscode-editor-data）：以 plain 为准，HTML 仅为语法高亮壳
 * 2. plain 已含 Markdown 结构或 vditor 内联 HTML：丢弃会误导的 HTML
 * 3. 其他 IDE 代码 HTML（IntelliJ 等）：保留 HTML 供 processPasteCode 识别语言
 * 4. 其余：保留 HTML，走 Word / 网页富文本路径
 */
export const routePasteClipboard = (
    textHTML: string,
    textPlain: string,
    vscodeEditorData: string,
): { textHTML: string; textPlain: string } => {
    if (!textPlain.trim() || !textHTML.trim()) {
        return { textHTML, textPlain };
    }

    if (vscodeEditorData) {
        return { textHTML: "", textPlain };
    }

    if (inlineHTMLTagInPlain.test(textPlain) || isMarkdownLikePlain(textPlain)) {
        return { textHTML: "", textPlain };
    }

    if (isIdeCodeHtml(textHTML)) {
        return { textHTML, textPlain };
    }

    return { textHTML, textPlain };
};
