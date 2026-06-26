import { codeMirrorPreviewRender } from "../codeBlock/codeMirrorPreviewRender";
import { ensureMathBlockPreviewMode, renderCodeBlocks } from "../codeBlock/codeMirrorManager";
import { codeRender } from "../markdown/codeRender";
import { mathRender } from "../markdown/mathRender";
import { mermaidRender } from "../markdown/mermaidRender";
import { plantumlRender } from "../markdown/plantumlRender";
import { isCmCodeBlock } from "../codeBlock/codeMirrorManager";
import { normalizePasteFenceLanguage } from "../codeBlock/codeBlockLanguageHints";
import { getEditorRange, insertHTML, setRangeByWbr } from "./selection";

const inlineMdHTMLInPlain = /<(mark|kbd|u|span|del|sub|sup)\b[^>]*>[\s\S]*?<\/\1>/i;

export const isMarkdownLikePlain = (text: string): boolean => {
    const trimmed = text.trim();
    if (!trimmed) {
        return false;
    }
    if (/^#{1,6}\s/m.test(trimmed)) {
        return true;
    }
    if (/^\s*[-*+]\s/m.test(trimmed)) {
        return true;
    }
    if (/^\s*\d+\.\s/m.test(trimmed)) {
        return true;
    }
    if (/\[\[[^\]]+\]\]/.test(trimmed)) {
        return true;
    }
    if (inlineMdHTMLInPlain.test(trimmed)) {
        return true;
    }
    return false;
};

/** null=无 vscode 数据，false=有数据但不应走代码粘贴，string=语言（可为空） */
const parseVscodeEditorLanguage = (raw: string): string | false | null => {
    if (!raw) {
        return null;
    }
    try {
        const mode = ((JSON.parse(raw) as { mode?: string }).mode || "").trim();
        const modeLower = mode.toLowerCase();
        if (!modeLower || modeLower === "markdown") {
            return false;
        }
        return normalizePasteFenceLanguage(mode);
    } catch {
        return false;
    }
};

const languageFromHtml = (root: HTMLElement): string => {
    const codeEl = root.querySelector("code");
    if (codeEl) {
        for (let i = 0; i < codeEl.classList.length; i++) {
            const cls = codeEl.classList[i];
            if (cls.startsWith("language-")) {
                return cls.slice("language-".length);
            }
        }
    }
    const hljsEl = root.querySelector("[class*='hljs-']");
    if (hljsEl) {
        for (let i = 0; i < hljsEl.classList.length; i++) {
            const cls = hljsEl.classList[i];
            if (cls.startsWith("hljs-") && cls !== "hljs") {
                return cls.slice("hljs-".length);
            }
        }
    }
    return "";
};

export const isIdeCodeHtml = (html: string): boolean => {
    if (!html.trim()) {
        return false;
    }
    if (html.indexOf("\n ") === 0) {
        return true;
    }
    const tempElement = document.createElement("div");
    tempElement.innerHTML = html;
    if (tempElement.childElementCount === 1) {
        const only = tempElement.lastElementChild as HTMLElement;
        if (only.style?.fontFamily?.indexOf("monospace") > -1) {
            return true;
        }
    }
    const pres = tempElement.querySelectorAll("pre");
    if (tempElement.childElementCount === 1 && pres.length === 1) {
        const pre = pres[0];
        if (pre.className !== "vditor-wysiwyg" && pre.className !== "vditor-sv") {
            return true;
        }
    }
    if (tempElement.childElementCount === 1 && tempElement.firstElementChild?.tagName === "TABLE"
        && tempElement.querySelector(".line-number") && tempElement.querySelector(".line-content")) {
        return true;
    }
    return false;
};

const buildPasteMarkdown = (code: string, language: string): string => {
    if (language === "math") {
        if (/\n/.test(code)) {
            return `\n$$\n${code}\n$$\n`;
        }
        return `$$\n${code}\n$$`;
    }
    if (/\n/.test(code)) {
        const langLine = language ? language : "";
        return `\n\`\`\`${langLine}\n${code}\n\`\`\`\n`;
    }
    if (code.includes("`")) {
        return `\`\`${code}\`\``;
    }
    return `\`${code}\``;
};

export const processPasteCode = (
    html: string,
    text: string,
    _type = "ir",
    vscodeEditorData = "",
): string | false => {
    const plain = text || "";
    if (!plain.trim()) {
        return false;
    }

    const vscodeLanguage = parseVscodeEditorLanguage(vscodeEditorData);
    if (vscodeLanguage === false) {
        return false;
    }
    const fromVscodeEditor = vscodeLanguage !== null;

    if (!fromVscodeEditor && !isIdeCodeHtml(html)) {
        return false;
    }

    const language = fromVscodeEditor
        ? vscodeLanguage
        : normalizePasteFenceLanguage(languageFromHtml((() => {
            const el = document.createElement("div");
            el.innerHTML = html;
            return el;
        })()));

    return buildPasteMarkdown(plain, language);
};

export const insertPastedCode = (vditor: IVditor, code: string) => {
    if (vditor.currentMode === "wysiwyg") {
        const range = getEditorRange(vditor);
        insertHTML(vditor.lute.Md2VditorDOM(code), vditor);
        renderCodeBlocks(vditor);
        setRangeByWbr(vditor.wysiwyg.element, range);
        return;
    }
    if (vditor.currentMode === "ir") {
        insertHTML(vditor.lute.Md2VditorIRDOM(code), vditor);
    }
};

export const processCodeRender = (previewPanel: HTMLElement, vditor: IVditor) => {
    if (!previewPanel) {
        return;
    }
    const parentElement = previewPanel.parentElement;
    if (!parentElement) {
        return;
    }
    if (parentElement.getAttribute("data-type") === "html-block") {
        previewPanel.setAttribute("data-render", "1");
        return;
    }
    if (isCmCodeBlock(parentElement)) {
        renderCodeBlocks(vditor);
        previewPanel.setAttribute("data-render", "1");
        return;
    }
    const codeElement = previewPanel.firstElementChild as HTMLElement | null;
    if (!codeElement) {
        return;
    }
    const language = codeElement.className.replace("language-", "");
    if (!language) {
        return;
    }
    if (language === "mermaid") {
        mermaidRender(previewPanel, vditor.options.cdn, vditor);
    } else if (language === "plantuml") {
        plantumlRender(previewPanel, vditor.options.cdn);
    } else if (language === "math") {
        mathRender(previewPanel, { cdn: vditor.options.cdn, math: vditor.options.preview.math });
        if (parentElement.getAttribute("data-type") === "math-block") {
            ensureMathBlockPreviewMode(parentElement);
        }
    } else {
        codeRender(previewPanel);
        codeMirrorPreviewRender(previewPanel);
    }

    previewPanel.setAttribute("data-render", "1");
};
