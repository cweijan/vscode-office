import { EditorView } from "@codemirror/view";

const escapeAttr = (value: string) => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");

const SKIP_COPY_CLASSES = new Set([
    "cm-cursor",
    "cm-matchingBracket",
    "cm-nonmatchingBracket",
    "cm-activeLine",
    "cm-activeLineGutter",
]);

const isSyntaxHighlightSpan = (el: HTMLElement): boolean => {
    for (let i = 0; i < el.classList.length; i++) {
        const cls = el.classList[i];
        if (cls.startsWith("cm-") && !SKIP_COPY_CLASSES.has(cls) && cls !== "cm-line") {
            return true;
        }
    }
    return false;
};

const isVisibleBackground = (bg: string): boolean => {
    if (!bg || bg === "transparent" || bg === "rgba(0, 0, 0, 0)") {
        return false;
    }
    return true;
};

const inlineStyleFromElement = (el: HTMLElement, baseline: CSSStyleDeclaration): string => {
    const computed = window.getComputedStyle(el);
    const parts: string[] = [];
    if (computed.color && computed.color !== baseline.color) {
        parts.push(`color: ${computed.color}`);
    }
    if (computed.backgroundColor && isVisibleBackground(computed.backgroundColor)
        && computed.backgroundColor !== baseline.backgroundColor) {
        parts.push(`background-color: ${computed.backgroundColor}`);
    }
    if (computed.fontWeight && computed.fontWeight !== baseline.fontWeight) {
        parts.push(`font-weight: ${computed.fontWeight}`);
    }
    if (computed.fontStyle && computed.fontStyle !== baseline.fontStyle) {
        parts.push(`font-style: ${computed.fontStyle}`);
    }
    const decoration = computed.textDecorationLine;
    if (decoration && decoration !== "none" && decoration !== baseline.textDecorationLine) {
        parts.push(`text-decoration: ${decoration}`);
    }
    return parts.join("; ");
};

const shouldSkipCopyNode = (el: HTMLElement): boolean => {
    for (let i = 0; i < el.classList.length; i++) {
        if (SKIP_COPY_CLASSES.has(el.classList[i])) {
            return true;
        }
    }
    return false;
};

const getCmLineElement = (view: EditorView, lineNumber: number): HTMLElement | null => {
    const lineIndex = lineNumber - 1;
    if (lineIndex < 0 || lineIndex >= view.contentDOM.children.length) {
        return null;
    }
    return view.contentDOM.children[lineIndex] as HTMLElement;
};

const serializeCmLineRange = (
    lineEl: HTMLElement,
    docLineFrom: number,
    from: number,
    to: number,
): string => {
    const relFrom = Math.max(0, from - docLineFrom);
    const relTo = Math.min(lineEl.textContent?.length ?? 0, to - docLineFrom);
    if (relFrom >= relTo) {
        return "";
    }

    const baseline = window.getComputedStyle(lineEl);
    const offset = { value: 0 };

    const walk = (node: Node): string => {
        if (offset.value >= relTo) {
            return "";
        }
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent || "";
            const nodeStart = offset.value;
            const nodeEnd = nodeStart + text.length;
            const clipFrom = Math.max(relFrom, nodeStart) - nodeStart;
            const clipTo = Math.min(relTo, nodeEnd) - nodeStart;
            offset.value = nodeEnd;
            if (clipFrom >= clipTo) {
                return "";
            }
            return Lute.EscapeHTMLStr(text.slice(clipFrom, clipTo));
        }
        if (node.nodeType !== Node.ELEMENT_NODE) {
            return "";
        }
        const el = node as HTMLElement;
        if (shouldSkipCopyNode(el)) {
            let skipped = "";
            for (let i = 0; i < el.childNodes.length; i++) {
                skipped += walk(el.childNodes[i]);
            }
            return skipped;
        }
        const markOffset = offset.value;
        let inner = "";
        for (let i = 0; i < el.childNodes.length; i++) {
            inner += walk(el.childNodes[i]);
        }
        if (!inner) {
            return "";
        }
        if (!isSyntaxHighlightSpan(el)) {
            return inner;
        }
        const style = inlineStyleFromElement(el, baseline);
        if (!style) {
            return inner;
        }
        return `<span style="${escapeAttr(style)}">${inner}</span>`;
    };

    let html = "";
    for (let i = 0; i < lineEl.childNodes.length; i++) {
        html += walk(lineEl.childNodes[i]);
    }
    return html;
};

const buildStyledHtmlForRange = (view: EditorView, from: number, to: number): string => {
    const doc = view.state.doc;
    const startLine = doc.lineAt(from);
    const endLine = doc.lineAt(to);
    const lineHtml: string[] = [];

    for (let lineNumber = startLine.number; lineNumber <= endLine.number; lineNumber++) {
        const line = doc.line(lineNumber);
        const sliceFrom = Math.max(from, line.from);
        const sliceTo = Math.min(to, line.to);
        if (sliceFrom >= sliceTo) {
            continue;
        }
        const lineEl = getCmLineElement(view, lineNumber);
        if (!lineEl) {
            lineHtml.push(Lute.EscapeHTMLStr(doc.sliceString(sliceFrom, sliceTo)));
            continue;
        }
        lineHtml.push(serializeCmLineRange(lineEl, line.from, sliceFrom, sliceTo));
    }

    return lineHtml.join("<br>");
};

const SKIP_PRE_STYLE_LANGUAGES = ["markdown", "mermaid", "plantuml", "math", "latex"];

const wrapCodeCopyHtml = (innerHtml: string, languageName: string, view: EditorView): string => {
    const langClass = languageName ? ` class="language-${languageName}"` : "";
    const lang = languageName.toLowerCase();
    if (SKIP_PRE_STYLE_LANGUAGES.includes(lang)) {
        return `<meta charset='utf-8'><pre><code${langClass}>${innerHtml}</code></pre>`;
    }
    const editorStyle = window.getComputedStyle(view.dom);
    const contentStyle = window.getComputedStyle(view.contentDOM);
    const preParts: string[] = [
        `display: block`,
        `font-family: ${contentStyle.fontFamily}`,
        `font-size: ${contentStyle.fontSize}`,
        `line-height: ${contentStyle.lineHeight}`,
        `color: ${contentStyle.color}`,
        `margin: 0`,
        `tab-size: ${contentStyle.tabSize || "4"}`,
        `white-space: pre-wrap`,
    ];
    const editorBg = editorStyle.backgroundColor;
    if (isVisibleBackground(editorBg)) {
        preParts.push(`background-color: ${editorBg}`);
    }
    const padTop = contentStyle.paddingTop;
    const padRight = contentStyle.paddingRight;
    const padBottom = contentStyle.paddingBottom;
    const padLeft = contentStyle.paddingLeft;
    if (padTop !== "0px" || padRight !== "0px" || padBottom !== "0px" || padLeft !== "0px") {
        preParts.push(`padding: ${padTop} ${padRight} ${padBottom} ${padLeft}`);
    } else {
        preParts.push("padding: 8px 12px");
    }
    const preStyle = preParts.join("; ");
    return `<meta charset='utf-8'><pre style="${escapeAttr(preStyle)}"><code${langClass}>${innerHtml}</code></pre>`;
};

export const buildCodeMirrorRichCopyHtml = (
    view: EditorView,
    from: number,
    to: number,
    languageName: string,
): string => {
    if (from >= to) {
        return wrapCodeCopyHtml("", languageName, view);
    }
    const inner = buildStyledHtmlForRange(view, from, to);
    return wrapCodeCopyHtml(inner, languageName, view);
};

export const resolveCodeMirrorCopyPayload = (
    view: EditorView,
    languageName: string,
    wholeDocumentIfNoSelection = false,
): { plain: string; html: string } | null => {
    const ranges: { from: number; to: number }[] = [];
    for (const range of view.state.selection.ranges) {
        if (range.from !== range.to) {
            ranges.push({ from: range.from, to: range.to });
        }
    }
    if (ranges.length === 0) {
        if (!wholeDocumentIfNoSelection || view.state.doc.length === 0) {
            return null;
        }
        ranges.push({ from: 0, to: view.state.doc.length });
    }

    const plainParts: string[] = [];
    const htmlParts: string[] = [];
    for (let i = 0; i < ranges.length; i++) {
        const { from, to } = ranges[i];
        plainParts.push(view.state.sliceDoc(from, to));
        htmlParts.push(buildStyledHtmlForRange(view, from, to));
    }

    const plain = plainParts.join("\n");
    const html = wrapCodeCopyHtml(htmlParts.join("<br>"), languageName, view);
    return { plain, html };
};
