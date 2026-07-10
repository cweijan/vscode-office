export const LIVE_MATH_TRIGGER_ATTR = "data-vditor-live-math-trigger";

const DELIMITER_ATTR = "data-vditor-math-delimiter";
const BLOCK_DELIMITER_VALUE = "bracket";
const INLINE_DELIMITER_VALUE = "paren";
const BLOCK_SENTINEL = "% __VDITOR_LATEX_BRACKET_MATH__";
const INLINE_SENTINEL = String.raw`\vphantom{\text{__VDITOR_LATEX_PAREN_MATH__}}`;
const OUTER_MATH_SELECTOR = [
    ".vditor-wysiwyg__block[data-type='math-block']",
    ".vditor-ir__node[data-type='math-block']",
].join(",");
const INLINE_MATH_SELECTOR = [
    ".vditor-math-inline[data-type='math-inline']",
    ".vditor-ir__node",
].join(",");

type Fence = {
    char: string;
    length: number;
};

type TextCharacter = {
    node: Text;
    offset: number;
    value: string;
};

const splitContainerPrefix = (line: string) => {
    const match = line.match(/^((?:[ \t]{0,3}>[ \t]?)*[ \t]*)(.*)$/);
    return {
        prefix: match?.[1] ?? "",
        content: match?.[2] ?? line,
    };
};

const updateFenceState = (content: string, fence: Fence | null): Fence | null => {
    const match = content.match(/^(`{3,}|~{3,})(?:[^`~]*)$/);
    if (!match) {
        return fence;
    }

    const marker = match[1];
    if (!fence) {
        return {char: marker[0], length: marker.length};
    }
    if (marker[0] === fence.char && marker.length >= fence.length) {
        return null;
    }
    return fence;
};

const backslashRunLength = (text: string, index: number) => {
    let start = index;
    while (start > 0 && text[start - 1] === "\\") {
        start -= 1;
    }
    return index - start + 1;
};

const findParenMathClose = (text: string, start: number) => {
    let match = start;
    while ((match = text.indexOf(String.raw`\)`, match)) >= 0) {
        if (backslashRunLength(text, match) % 2 === 1) {
            return match;
        }
        match += 2;
    }
    return -1;
};

const normalizeParenMathInLine = (line: string) => {
    let output = "";
    let index = 0;

    while (index < line.length) {
        if (line[index] === "`") {
            let runEnd = index + 1;
            while (line[runEnd] === "`") {
                runEnd += 1;
            }
            const marker = line.slice(index, runEnd);
            const close = line.indexOf(marker, runEnd);
            if (close < 0) {
                return output + line.slice(index);
            }
            output += line.slice(index, close + marker.length);
            index = close + marker.length;
            continue;
        }

        if (line.startsWith(String.raw`\(`, index) &&
            backslashRunLength(line, index) % 2 === 1) {
            const close = findParenMathClose(line, index + 2);
            if (close >= 0) {
                const content = line.slice(index + 2, close);
                if (content) {
                    output += `$${INLINE_SENTINEL}${content}$`;
                    index = close + 2;
                    continue;
                }
            }
        }

        output += line[index];
        index += 1;
    }

    return output;
};

/** 将 LaTeX 括号定界符临时转换为 Lute 原生的美元定界符。 */
export const normalizeLatexDelimitersForLute = (markdown: string) => {
    const lines = String(markdown ?? "").split("\n");
    const output: string[] = [];
    let fence: Fence | null = null;
    let inBracketMath = false;
    let inDollarMath = false;

    for (const line of lines) {
        const {prefix, content} = splitContainerPrefix(line);

        if (!inBracketMath) {
            const nextFence = updateFenceState(content, fence);
            if (nextFence !== fence) {
                fence = nextFence;
                output.push(line);
                continue;
            }
            if (fence) {
                output.push(line);
                continue;
            }

            if (inDollarMath) {
                output.push(line);
                if (content.trim().endsWith("$$")) {
                    inDollarMath = false;
                }
                continue;
            }

            const singleLine = content.match(/^\\\[\s*([\s\S]*?)\s*\\\]\s*$/);
            if (singleLine) {
                output.push(`${prefix}$$`);
                output.push(`${prefix}${BLOCK_SENTINEL}`);
                if (singleLine[1]) {
                    output.push(`${prefix}${singleLine[1]}`);
                }
                output.push(`${prefix}$$`);
                continue;
            }

            if (/^\\\[\s*$/.test(content)) {
                output.push(`${prefix}$$`);
                output.push(`${prefix}${BLOCK_SENTINEL}`);
                inBracketMath = true;
                continue;
            }

            const trimmed = content.trim();
            if (trimmed.startsWith("$$")) {
                output.push(line);
                if (!trimmed.slice(2).includes("$$")) {
                    inDollarMath = true;
                }
                continue;
            }

            output.push(`${prefix}${normalizeParenMathInLine(content)}`);
            continue;
        }

        if (/^\\\]\s*$/.test(content)) {
            output.push(`${prefix}$$`);
            inBracketMath = false;
        } else {
            output.push(line);
        }
    }

    return output.join("\n");
};

const findClosingDollar = (markdown: string, start: number) => {
    for (let index = start; index < markdown.length; index += 1) {
        if (markdown[index] !== "$") {
            continue;
        }
        let slashCount = 0;
        for (let slash = index - 1; slash >= 0 && markdown[slash] === "\\"; slash -= 1) {
            slashCount += 1;
        }
        if (slashCount % 2 === 0) {
            return index;
        }
    }
    return -1;
};

const restoreParenMathFromLute = (markdown: string) => {
    const opening = `$${INLINE_SENTINEL}`;
    let output = "";
    let index = 0;

    while (index < markdown.length) {
        const open = markdown.indexOf(opening, index);
        if (open < 0) {
            output += markdown.slice(index);
            break;
        }
        const contentStart = open + opening.length;
        const close = findClosingDollar(markdown, contentStart);
        if (close < 0) {
            output += markdown.slice(index);
            break;
        }
        output += markdown.slice(index, open);
        output += String.raw`\(`;
        output += markdown.slice(contentStart, close);
        output += String.raw`\)`;
        index = close + 1;
    }

    return output;
};

/** 将带内部标记的数学节点恢复成用户输入的 LaTeX 括号定界符。 */
export const restoreLatexDelimitersFromLute = (markdown: string) => {
    const lines = String(markdown ?? "").split("\n");
    const output: string[] = [];

    for (let index = 0; index < lines.length;) {
        const opener = splitContainerPrefix(lines[index]);
        if (opener.content.trim() !== "$$") {
            output.push(lines[index]);
            index += 1;
            continue;
        }

        let closeIndex = index + 1;
        let sentinelIndex = -1;
        for (; closeIndex < lines.length; closeIndex += 1) {
            const current = splitContainerPrefix(lines[closeIndex]).content.trim();
            if (current === BLOCK_SENTINEL) {
                sentinelIndex = closeIndex;
            }
            if (current === "$$") {
                break;
            }
        }

        if (closeIndex >= lines.length || sentinelIndex < 0) {
            output.push(lines[index]);
            index += 1;
            continue;
        }

        output.push(`${opener.prefix}\\[`);
        for (let contentIndex = index + 1; contentIndex < closeIndex; contentIndex += 1) {
            if (contentIndex !== sentinelIndex) {
                output.push(lines[contentIndex]);
            }
        }
        output.push(`${splitContainerPrefix(lines[closeIndex]).prefix}\\]`);
        index = closeIndex + 1;
    }

    return restoreParenMathFromLute(output.join("\n"));
};

const htmlFragment = (html: string) => {
    const template = document.createElement("template");
    template.innerHTML = html;
    return template;
};

const mathBlocks = (root: ParentNode) => {
    const blocks = new Set<HTMLElement>();
    root.querySelectorAll(OUTER_MATH_SELECTOR).forEach((block) => {
        blocks.add(block as HTMLElement);
    });
    root.querySelectorAll("[data-type='math-block-open-marker']").forEach((marker) => {
        const block = marker.closest(".vditor-ir__node");
        if (block) {
            blocks.add(block as HTMLElement);
        }
    });
    return Array.from(blocks);
};

const mathCode = (block: HTMLElement) => {
    for (const code of Array.from(block.querySelectorAll("code[data-type='math-block']"))) {
        if (code.closest(OUTER_MATH_SELECTOR) === block) {
            return code as HTMLElement;
        }
    }
    return null;
};

const inlineMathContainers = (root: ParentNode) => {
    const containers = new Set<HTMLElement>();
    root.querySelectorAll(".vditor-math-inline[data-type='math-inline']").forEach((container) => {
        containers.add(container as HTMLElement);
    });
    root.querySelectorAll("code[data-type='math-inline']").forEach((code) => {
        const container = code.closest(".vditor-math-inline[data-type='math-inline']") ??
            code.closest(".vditor-ir__node");
        if (container) {
            containers.add(container as HTMLElement);
        }
    });
    return Array.from(containers);
};

const inlineMathCode = (container: HTMLElement) => {
    for (const code of Array.from(container.querySelectorAll("code[data-type='math-inline']"))) {
        if (code.closest(INLINE_MATH_SELECTOR) === container) {
            return code as HTMLElement;
        }
    }
    return null;
};

const removeBlockSentinel = (text: string) => {
    const lines = String(text ?? "").split("\n");
    const index = lines.findIndex((line) => line.trim() === BLOCK_SENTINEL);
    if (index < 0) {
        return null;
    }
    lines.splice(index, 1);
    return lines.join("\n").replace(/^\n/, "");
};

const textCharactersBefore = (scope: Element, boundary: Node) => {
    const characters: TextCharacter[] = [];
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
        if (!(node.compareDocumentPosition(boundary) & Node.DOCUMENT_POSITION_FOLLOWING)) {
            continue;
        }
        const text = node as Text;
        for (let offset = 0; offset < text.data.length; offset += 1) {
            if (text.data[offset] !== "\u200b") {
                characters.push({node: text, offset, value: text.data[offset]});
            }
        }
    }
    return characters;
};

const removeEmptyBackslashWrappers = (scope: Element) => {
    scope.querySelectorAll("[data-type='backslash']").forEach((element) => {
        if (!element.textContent && !element.querySelector("wbr")) {
            element.remove();
        }
    });
};

const normalizeLiveMathHtmlForLute = (html: string) => {
    const template = htmlFragment(html);

    for (const wbr of Array.from(template.content.querySelectorAll("wbr"))) {
        if (wbr.closest("code, pre, [data-type='math-block'], [data-type='math-inline']")) {
            continue;
        }
        const scope = wbr.closest("p, li, blockquote, div[data-block]") ?? wbr.parentElement;
        if (!scope) {
            continue;
        }

        const characters = textCharactersBefore(scope, wbr);
        if (characters.length < 2) {
            continue;
        }
        const before = characters.map((character) => character.value).join("");
        const rangeAfter = document.createRange();
        rangeAfter.selectNodeContents(scope);
        rangeAfter.setStartAfter(wbr);
        const meaningfulAfter = rangeAfter.toString().replaceAll("\u200b", "").trim();

        // 浏览器会自动补全 "[" 的右括号，Spin 前需要一并移除。
        if (before.trim() === String.raw`\[` &&
            (!meaningfulAfter || meaningfulAfter === "]")) {
            scope.replaceChildren(document.createTextNode("$$"), wbr);
            return {html: template.innerHTML, trigger: BLOCK_DELIMITER_VALUE};
        }

        if (!before.endsWith(String.raw`\(`)) {
            continue;
        }
        let slashCount = 0;
        for (let index = characters.length - 2;
             index >= 0 && characters[index].value === "\\";
             index -= 1) {
            slashCount += 1;
        }
        if (slashCount % 2 === 0) {
            continue;
        }

        const openingSlash = characters[characters.length - 2];
        if (openingSlash.node.parentElement?.closest(
            "code, pre, [data-type='code-block'], [data-type='math-block'], " +
            "[data-type='math-inline'], [data-type='inline-code']",
        )) {
            continue;
        }
        const triggerRange = document.createRange();
        triggerRange.setStart(openingSlash.node, openingSlash.offset);
        triggerRange.setEndBefore(wbr);
        triggerRange.deleteContents();
        triggerRange.insertNode(document.createTextNode(`$${INLINE_SENTINEL}$`));
        removeEmptyBackslashWrappers(scope);
        return {html: template.innerHTML, trigger: INLINE_DELIMITER_VALUE};
    }

    return {html: String(html ?? ""), trigger: null as string | null};
};

const setIrInlineMarkers = (container: HTMLElement, opening: string, closing: string) => {
    const markers = container.querySelectorAll("span.vditor-ir__marker");
    if (markers.length >= 2) {
        markers[0].textContent = opening;
        markers[markers.length - 1].textContent = closing;
    }
};

const hasAdjacentWbr = (container: HTMLElement) => {
    let node = container.nextSibling;
    while (node?.nodeType === Node.TEXT_NODE && !node.textContent?.replaceAll("\u200b", "")) {
        node = node.nextSibling;
    }
    return node?.nodeName === "WBR";
};

const markMathDelimitersInHtml = (html: string, liveTrigger: string | null = null) => {
    const template = htmlFragment(html);
    for (const block of mathBlocks(template.content)) {
        const code = mathCode(block);
        const cleanedCode = removeBlockSentinel(code?.textContent ?? "");
        const isLiveBracket = liveTrigger === BLOCK_DELIMITER_VALUE &&
            Boolean(block.querySelector("wbr"));
        if (cleanedCode === null && !isLiveBracket) {
            continue;
        }

        block.setAttribute(DELIMITER_ATTR, BLOCK_DELIMITER_VALUE);
        if (code && cleanedCode !== null) {
            code.textContent = cleanedCode;
            block.querySelectorAll(".language-math").forEach((preview) => {
                const cleanedPreview = removeBlockSentinel(preview.textContent ?? "");
                if (cleanedPreview !== null) {
                    preview.textContent = cleanedPreview;
                }
            });
        }
    }

    for (const container of inlineMathContainers(template.content)) {
        const code = inlineMathCode(container);
        if (!code?.textContent?.includes(INLINE_SENTINEL)) {
            continue;
        }
        container.setAttribute(DELIMITER_ATTR, INLINE_DELIMITER_VALUE);
        code.textContent = code.textContent.replace(INLINE_SENTINEL, "");
        container.querySelectorAll(".language-math").forEach((preview) => {
            preview.textContent = (preview.textContent ?? "").replace(INLINE_SENTINEL, "");
        });
        if (container.matches(".vditor-ir__node")) {
            container.setAttribute("data-type", "math-inline");
        }
        setIrInlineMarkers(container, String.raw`\(`, String.raw`\)`);
        if (liveTrigger === INLINE_DELIMITER_VALUE && hasAdjacentWbr(container)) {
            container.setAttribute(LIVE_MATH_TRIGGER_ATTR, INLINE_DELIMITER_VALUE);
        }
    }

    return template.innerHTML;
};

const injectSentinelsIntoHtml = (html: string) => {
    const template = htmlFragment(html);
    for (const block of mathBlocks(template.content)) {
        if (block.getAttribute(DELIMITER_ATTR) !== BLOCK_DELIMITER_VALUE) {
            continue;
        }
        const code = mathCode(block);
        if (code && !String(code.textContent ?? "").includes(BLOCK_SENTINEL)) {
            code.textContent = `${BLOCK_SENTINEL}\n${code.textContent ?? ""}`;
        }
    }

    for (const container of inlineMathContainers(template.content)) {
        if (container.getAttribute(DELIMITER_ATTR) !== INLINE_DELIMITER_VALUE) {
            continue;
        }
        const code = inlineMathCode(container);
        if (code && !String(code.textContent ?? "").includes(INLINE_SENTINEL)) {
            const content = String(code.textContent ?? "");
            const leadingZwsp = content.startsWith("\u200b") ? "\u200b" : "";
            code.textContent = `${leadingZwsp}${INLINE_SENTINEL}${content.slice(leadingZwsp.length)}`;
        }
        setIrInlineMarkers(container, "$", "$");
    }
    return template.innerHTML;
};

const patchSpinMethod = (lute: Lute, methodName: "SpinVditorDOM" | "SpinVditorIRDOM") => {
    const spin = lute[methodName].bind(lute);
    lute[methodName] = (html: string) => {
        const withSentinels = injectSentinelsIntoHtml(html);
        const normalized = normalizeLiveMathHtmlForLute(withSentinels);
        return markMathDelimitersInHtml(spin(normalized.html), normalized.trigger);
    };
};

/** 为单个 Lute 实例增加 LaTeX 括号定界符的解析、编辑和保存支持。 */
export const enableLatexDelimiterSupport = (lute: Lute) => {
    const mdToWysiwyg = lute.Md2VditorDOM.bind(lute);
    const mdToIr = lute.Md2VditorIRDOM.bind(lute);
    const wysiwygToMd = lute.VditorDOM2Md.bind(lute);
    const irToMd = lute.VditorIRDOM2Md.bind(lute);

    lute.Md2VditorDOM = (markdown: string) =>
        markMathDelimitersInHtml(mdToWysiwyg(normalizeLatexDelimitersForLute(markdown)));
    lute.Md2VditorIRDOM = (markdown: string) =>
        markMathDelimitersInHtml(mdToIr(normalizeLatexDelimitersForLute(markdown)));
    lute.VditorDOM2Md = (html: string) =>
        restoreLatexDelimitersFromLute(wysiwygToMd(injectSentinelsIntoHtml(html)));
    lute.VditorIRDOM2Md = (html: string) =>
        restoreLatexDelimitersFromLute(irToMd(injectSentinelsIntoHtml(html)));
    patchSpinMethod(lute, "SpinVditorDOM");
    patchSpinMethod(lute, "SpinVditorIRDOM");

    return lute;
};
