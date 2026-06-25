import { Constants } from "../constants";
import { isChrome } from "./compatibility";
import { adjustEditorScrollBy } from "./documentState";
import { hasClosestBlock, hasClosestByClassName, hasClosestByMatchTag } from "./hasClosest";

export const getEditorRange = (vditor: IVditor) => {
    let range: Range;
    const element = vditor[vditor.currentMode].element;
    if (getSelection().rangeCount > 0) {
        range = getSelection().getRangeAt(0);
        if (element.isEqualNode(range.startContainer) || element.contains(range.startContainer)) {
            return range;
        }
    }
    if (vditor[vditor.currentMode].range) {
        return vditor[vditor.currentMode].range;
    }
    element.focus({ preventScroll: true });
    range = element.ownerDocument.createRange();
    range.setStart(element, 0);
    range.collapse(true);
    return range;
};

export const getSelectionRangeInEditor = (editor: HTMLElement): Range | null => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
        return null;
    }
    const range = selection.getRangeAt(0);
    if (editor.isEqualNode(range.startContainer) || editor.contains(range.startContainer)) {
        return range;
    }
    return null;
};

export const getRangeCaretRect = (range: Range): DOMRect | null => {
    const rects = range.getClientRects();
    if (rects.length > 0) {
        return rects[0];
    }
    if (range.startContainer.nodeType === 3) {
        const parent = range.startContainer.parentElement;
        if (parent && parent.getClientRects().length > 0) {
            return parent.getClientRects()[0];
        }
        return null;
    }
    const children = (range.startContainer as Element).children;
    if (children[range.startOffset] && children[range.startOffset].getClientRects().length > 0) {
        return children[range.startOffset].getClientRects()[0];
    }
    if (range.startContainer.childNodes.length > 0) {
        const probe = document.createRange();
        probe.selectNode(range.startContainer.childNodes[Math.max(0, range.startOffset - 1)]);
        const probeRects = probe.getClientRects();
        if (probeRects.length > 0) {
            return probeRects[0];
        }
    }
    const element = range.startContainer as HTMLElement;
    if (element.getClientRects && element.getClientRects().length > 0) {
        return element.getClientRects()[0];
    }
    return null;
};

const scrollRectIntoEditorView = (vditor: IVditor, rect: DOMRect, padding = 24) => {
    const mode = vditor.currentMode;
    if (mode !== "wysiwyg" && mode !== "ir") {
        return;
    }
    const scrollEl = vditor[mode].element;
    const editorRect = scrollEl.getBoundingClientRect();
    if (rect.top < editorRect.top + padding) {
        adjustEditorScrollBy(vditor, rect.top - editorRect.top - padding);
    } else if (rect.bottom > editorRect.bottom - padding) {
        adjustEditorScrollBy(vditor, rect.bottom - editorRect.bottom + padding);
    }
};

export const scrollElementIntoEditorView = (vditor: IVditor, element: HTMLElement, padding = 24) => {
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
        return;
    }
    scrollRectIntoEditorView(vditor, rect, padding);
};

export const scrollCaretIntoEditorView = (vditor: IVditor, range: Range, padding = 24) => {
    const rect = getRangeCaretRect(range);
    if (!rect) {
        return;
    }
    scrollRectIntoEditorView(vditor, rect, padding);
};

export const preserveEditorScroll = (vditor: IVditor, action: () => void) => {
    const scrollEl = vditor[vditor.currentMode].element;
    const scrollTop = scrollEl.scrollTop;
    action();
    scrollEl.scrollTop = scrollTop;
};

/** 获取选区在编辑器内的字符偏移，与 setSelectionByPosition 对应 */
export const getEditorTextOffset = (editor: HTMLElement, range?: Range) => {
    if (!range) {
        if (getSelection().rangeCount === 0) {
            return { start: 0, end: 0 };
        }
        range = window.getSelection().getRangeAt(0);
    }
    try {
        const preRange = editor.ownerDocument.createRange();
        preRange.selectNodeContents(editor);
        preRange.setEnd(range.startContainer, range.startOffset);
        const start = preRange.toString().length;
        preRange.setEnd(range.endContainer, range.endOffset);
        const end = preRange.toString().length;
        return { start, end };
    } catch {
        return { start: 0, end: 0 };
    }
};

export const getNodePath = (root: Node, node: Node): number[] | undefined => {
    if (root.isSameNode(node)) {
        return [];
    }
    if (!root.contains(node)) {
        return undefined;
    }
    const path: number[] = [];
    let current: Node | null = node;
    while (current && !root.isSameNode(current)) {
        const parent = current.parentNode;
        if (!parent) {
            return undefined;
        }
        path.unshift(Array.prototype.indexOf.call(parent.childNodes, current));
        current = parent;
    }
    return path;
};

export const getNodeByPath = (root: Node, path?: number[]) => {
    if (!path) {
        return undefined;
    }
    let current: Node | undefined = root;
    for (const index of path) {
        current = current?.childNodes[index];
        if (!current) {
            return undefined;
        }
    }
    return current;
};

const clampNodeOffset = (node: Node, offset: number) => {
    if (node.nodeType === 3) {
        return Math.min(Math.max(0, offset), node.textContent?.length || 0);
    }
    return Math.min(Math.max(0, offset), node.childNodes.length);
};

export const setSelectionByPath = (
    editor: HTMLElement,
    startPath?: number[],
    startOffset = 0,
    endPath?: number[],
    endOffset = startOffset,
) => {
    const startNode = getNodeByPath(editor, startPath);
    const endNode = getNodeByPath(editor, endPath);
    if (!startNode || !endNode) {
        return undefined;
    }
    try {
        const range = editor.ownerDocument.createRange();
        range.setStart(startNode, clampNodeOffset(startNode, startOffset));
        range.setEnd(endNode, clampNodeOffset(endNode, endOffset));
        setSelectionFocus(range);
        return range;
    } catch {
        return undefined;
    }
};

export const getCursorPosition = (editor: HTMLElement) => {
    const range = window.getSelection().getRangeAt(0);
    if (!editor.contains(range.startContainer) && !hasClosestByClassName(range.startContainer, "vditor-panel--none")) {
        return {
            left: 0,
            top: 0,
        };
    }
    const parentRect = editor.parentElement.getBoundingClientRect();
    let cursorRect;
    if (range.getClientRects().length === 0) {
        if (range.startContainer.nodeType === 3) {
            // 空行时，会出现没有 br 的情况，需要根据父元素 <p> 获取位置信息
            const parent = range.startContainer.parentElement;
            if (parent && parent.getClientRects().length > 0) {
                cursorRect = parent.getClientRects()[0];
            } else {
                return {
                    left: 0,
                    top: 0,
                };
            }
        } else {
            const children = (range.startContainer as Element).children;
            if (children[range.startOffset] &&
                children[range.startOffset].getClientRects().length > 0) {
                // markdown 模式回车
                cursorRect = children[range.startOffset].getClientRects()[0];
            } else if (range.startContainer.childNodes.length > 0) {
                // in table or code block
                const cloneRange = range.cloneRange();
                range.selectNode(range.startContainer.childNodes[Math.max(0, range.startOffset - 1)]);
                cursorRect = range.getClientRects()[0];
                range.setEnd(cloneRange.endContainer, cloneRange.endOffset);
                range.setStart(cloneRange.startContainer, cloneRange.startOffset);
            } else {
                cursorRect = (range.startContainer as HTMLElement).getClientRects()[0];
            }
            if (!cursorRect) {
                let parentElement = range.startContainer.childNodes[range.startOffset] as HTMLElement;
                while (!parentElement.getClientRects ||
                    (parentElement.getClientRects && parentElement.getClientRects().length === 0)) {
                    parentElement = parentElement.parentElement;
                }
                cursorRect = parentElement.getClientRects()[0];
            }
        }

    } else {
        cursorRect = range.getClientRects()[0];
    }

    return {
        left: cursorRect.left - parentRect.left,
        top: cursorRect.top - parentRect.top,
    };
};

export const selectIsEditor = (editor: HTMLElement, range?: Range) => {
    const activeElement = document.activeElement;
    if (activeElement && editor.contains(activeElement)) {
        return true;
    }
    if (!range) {
        if (getSelection().rangeCount === 0) {
            return false;
        } else {
            range = getSelection().getRangeAt(0);
        }
    }
    const container = range.commonAncestorContainer;

    return editor.isEqualNode(container) || editor.contains(container);
};

export const setSelectionFocus = (range: Range) => {
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
};

export const getSelectPosition = (selectElement: HTMLElement, editorElement: HTMLElement, range?: Range) => {
    const position = {
        end: 0,
        start: 0,
    };

    if (!range) {
        if (getSelection().rangeCount === 0) {
            return position;
        }
        range = window.getSelection().getRangeAt(0);
    }

    if (selectIsEditor(editorElement, range)) {
        const preSelectionRange = range.cloneRange();
        if (selectElement.childNodes[0] && selectElement.childNodes[0].childNodes[0]) {
            preSelectionRange.setStart(selectElement.childNodes[0].childNodes[0], 0);
        } else {
            preSelectionRange.selectNodeContents(selectElement);
        }
        preSelectionRange.setEnd(range.startContainer, range.startOffset);
        position.start = preSelectionRange.toString().length;
        position.end = position.start + range.toString().length;
    }
    return position;
};

export const setSelectionByPosition = (start: number, end: number, editor: HTMLElement) => {
    let charIndex = 0;
    let line = 0;
    let pNode = editor.childNodes[line];
    let foundStart = false;
    let stop = false;
    start = Math.max(0, start);
    end = Math.max(0, end);

    const range = editor.ownerDocument.createRange();
    range.setStart(pNode || editor, 0);
    range.collapse(true);

    while (!stop && pNode) {
        const nextCharIndex = charIndex + pNode.textContent.length;
        if (!foundStart && start >= charIndex && start <= nextCharIndex) {
            if (start === 0) {
                range.setStart(pNode, 0);
            } else {
                if (pNode.childNodes[0].nodeType === 3) {
                    range.setStart(pNode.childNodes[0], start - charIndex);
                } else if (pNode.nextSibling) {
                    range.setStartBefore(pNode.nextSibling);
                } else {
                    range.setStartAfter(pNode);
                }
            }
            foundStart = true;
            if (start === end) {
                stop = true;
                break;
            }
        }
        if (foundStart && end >= charIndex && end <= nextCharIndex) {
            if (end === 0) {
                range.setEnd(pNode, 0);
            } else {
                if (pNode.childNodes[0].nodeType === 3) {
                    range.setEnd(pNode.childNodes[0], end - charIndex);
                } else if (pNode.nextSibling) {
                    range.setEndBefore(pNode.nextSibling);
                } else {
                    range.setEndAfter(pNode);
                }
            }
            stop = true;
        }
        charIndex = nextCharIndex;
        pNode = editor.childNodes[++line];
    }

    if (!stop && editor.childNodes[line - 1]) {
        range.setStartBefore(editor.childNodes[line - 1]);
    }

    setSelectionFocus(range);
    return range;
};

export const setRangeByWbr = (element: HTMLElement, range: Range) => {
    const wbrElements = element.querySelectorAll("wbr");
    const wbrElement = wbrElements.length > 0 ? wbrElements[wbrElements.length - 1] as HTMLElement : null;
    if (!wbrElement) {
        return;
    }
    if (!wbrElement.previousElementSibling) {
        if (wbrElement.previousSibling) {
            // text<wbr>
            range.setStart(wbrElement.previousSibling, wbrElement.previousSibling.textContent.length);
        } else if (wbrElement.nextSibling) {
            if (wbrElement.nextSibling.nodeType === 3) {
                // <wbr>text
                range.setStart(wbrElement.nextSibling, 0);
            } else {
                // <wbr><br> https://github.com/Vanessa219/vditor/issues/400
                range.setStartBefore(wbrElement.nextSibling);
            }
        } else {
            // 内容为空
            range.setStart(wbrElement.parentElement, 0);
        }
    } else {
        if (wbrElement.previousElementSibling.isSameNode(wbrElement.previousSibling)) {
            if (wbrElement.previousElementSibling.lastChild) {
                // <em>text</em><wbr>
                range.setStartBefore(wbrElement);
                range.collapse(true);
                setSelectionFocus(range);
                // fix Chrome set range bug: **c**
                if (isChrome() && (wbrElement.previousElementSibling.tagName === "EM" ||
                    wbrElement.previousElementSibling.tagName === "STRONG" ||
                    wbrElement.previousElementSibling.tagName === "S")) {
                    range.insertNode(document.createTextNode(Constants.ZWSP));
                    range.collapse(false);
                }
                wbrElement.remove();
                return;
            } else {
                // <br><wbr>
                range.setStartAfter(wbrElement.previousElementSibling);
            }
        } else {
            // <em>text</em>text<wbr>
            range.setStart(wbrElement.previousSibling, wbrElement.previousSibling.textContent.length);
        }
    }
    range.collapse(true);
    wbrElement.remove();
    setSelectionFocus(range);
};

export const insertHTML = (html: string, vditor: IVditor) => {
    // 使用 lute 方法会添加 p 元素，只有一个 p 元素的时候进行删除
    const tempElement = document.createElement("div");
    tempElement.innerHTML = html;
    const tempBlockElement = tempElement.querySelectorAll("p");
    if (tempBlockElement.length === 1 && !tempBlockElement[0].previousSibling && !tempBlockElement[0].nextSibling &&
        vditor[vditor.currentMode].element.children.length > 0 && tempElement.firstElementChild.tagName === "P") {
        html = tempBlockElement[0].innerHTML.trim();
    }

    const pasteElement = document.createElement("div");
    pasteElement.innerHTML = html;

    const range = getEditorRange(vditor);
    if (range.toString() !== "") {
        vditor[vditor.currentMode].preventInput = true;
        document.execCommand("delete", false, "");
    }

    if (pasteElement.firstElementChild &&
        pasteElement.firstElementChild.getAttribute("data-block") === "0") {
        // 粘贴内容为块元素时，应在下一段落中插入
        pasteElement.lastElementChild.insertAdjacentHTML("beforeend", "<wbr>");
        const blockElement = hasClosestBlock(range.startContainer);
        if (!blockElement) {
            vditor[vditor.currentMode].element.insertAdjacentHTML("beforeend", pasteElement.innerHTML);
        } else {
            blockElement.insertAdjacentHTML("afterend", pasteElement.innerHTML);
        }
        setRangeByWbr(vditor[vditor.currentMode].element, range);
    } else {
        const pasteTemplate = document.createElement("template");
        pasteTemplate.innerHTML = html;
        range.insertNode(pasteTemplate.content.cloneNode(true));
        range.collapse(false);
        setSelectionFocus(range);
    }
};

const getCaretRangeFromPoint = (doc: Document, x: number, y: number): Range | null => {
    if (doc.caretRangeFromPoint) {
        return doc.caretRangeFromPoint(x, y);
    }
    const caretPositionFromPoint = (doc as Document & {
        caretPositionFromPoint?(x: number, y: number): { offsetNode: Node; offset: number } | null;
    }).caretPositionFromPoint;
    if (caretPositionFromPoint) {
        const pos = caretPositionFromPoint(x, y);
        if (!pos) {
            return null;
        }
        const range = doc.createRange();
        range.setStart(pos.offsetNode, pos.offset);
        range.collapse(true);
        return range;
    }
    return null;
};

const isSameCaretPosition = (a: Range, b: Range) => {
    return a.startContainer === b.startContainer && a.startOffset === b.startOffset;
};

const expandRangeForClientRect = (range: Range): Range => {
    const probe = range.cloneRange();
    if (probe.startContainer.nodeType === 3) {
        const text = probe.startContainer.textContent || "";
        if (probe.startOffset < text.length) {
            probe.setEnd(probe.startContainer, probe.startOffset + 1);
        } else if (probe.startOffset > 0) {
            probe.setStart(probe.startContainer, probe.startOffset - 1);
        }
        return probe;
    }
    if (probe.startContainer.nodeType === 1) {
        const el = probe.startContainer as Element;
        if (probe.startOffset < el.childNodes.length) {
            const child = el.childNodes[probe.startOffset];
            if (child.nodeType === 3) {
                const text = child.textContent || "";
                if (text.length > 0) {
                    probe.setStart(child, 0);
                    probe.setEnd(child, 1);
                }
            }
        } else if (probe.startOffset > 0) {
            const prev = el.childNodes[probe.startOffset - 1];
            if (prev.nodeType === 3) {
                const text = prev.textContent || "";
                if (text.length > 0) {
                    probe.setStart(prev, text.length - 1);
                    probe.setEnd(prev, text.length);
                }
            } else if (prev.nodeType === 1) {
                probe.selectNodeContents(prev);
                probe.collapse(false);
            }
        }
    }
    return probe;
};

const getRangeClientY = (range: Range): number | null => {
    const probe = expandRangeForClientRect(range);
    const rects = probe.getClientRects();
    if (rects.length > 0) {
        const rect = rects[0];
        return rect.top + rect.height / 2;
    }
    if (range.startContainer.nodeType === 1) {
        const child = range.startContainer.childNodes[range.startOffset] as Element | undefined;
        if (child && child.nodeType === 1) {
            const childRects = child.getClientRects();
            if (childRects.length > 0) {
                return childRects[0].top + childRects[0].height / 2;
            }
        }
    }
    const blockElement = hasClosestBlock(range.startContainer);
    if (blockElement) {
        const blockRects = blockElement.getClientRects();
        if (blockRects.length > 0) {
            return blockRects[0].top + blockRects[0].height / 2;
        }
    }
    return null;
};

const isClickOnCaretGlyph = (event: MouseEvent, caretRange: Range, tolerance = 3): boolean => {
    const probe = expandRangeForClientRect(caretRange);
    const rects = probe.getClientRects();
    for (let i = 0; i < rects.length; i++) {
        const rect = rects[i];
        if (event.clientX >= rect.left - tolerance && event.clientX <= rect.right + tolerance &&
            event.clientY >= rect.top - tolerance && event.clientY <= rect.bottom + tolerance) {
            return true;
        }
    }
    return false;
};

const collectListItemDirectContentTextNodes = (liElement: HTMLElement): Text[] => {
    const textNodes: Text[] = [];
    for (let i = 0; i < liElement.childNodes.length; i++) {
        const child = liElement.childNodes[i];
        if (child.nodeType === Node.ELEMENT_NODE) {
            const tagName = (child as HTMLElement).tagName;
            if (tagName === "INPUT" || tagName === "OL" || tagName === "UL") {
                continue;
            }
        }
        if (child.nodeType === Node.TEXT_NODE) {
            textNodes.push(child as Text);
            continue;
        }
        const walker = liElement.ownerDocument.createTreeWalker(child, NodeFilter.SHOW_TEXT);
        let currentTextNode = walker.nextNode() as Text | null;
        while (currentTextNode) {
            textNodes.push(currentTextNode);
            currentTextNode = walker.nextNode() as Text | null;
        }
    }
    return textNodes;
};

const getListItemLineStartRange = (liElement: HTMLElement): Range | null => {
    const textNodes = collectListItemDirectContentTextNodes(liElement);
    if (textNodes.length === 0) {
        return null;
    }
    const range = liElement.ownerDocument.createRange();
    range.setStart(textNodes[0], 0);
    range.collapse(true);
    return range;
};

const getListItemLineEndRange = (liElement: HTMLElement): Range | null => {
    const textNodes = collectListItemDirectContentTextNodes(liElement);
    let textNode: Text | null = null;
    for (let i = textNodes.length - 1; i >= 0; i--) {
        if (textNodes[i].textContent.replace(/[\s\u00a0]+$/, "").length > 0) {
            textNode = textNodes[i];
            break;
        }
    }
    if (!textNode && textNodes.length > 0) {
        textNode = textNodes[textNodes.length - 1];
    }
    if (!textNode) {
        return null;
    }
    const range = liElement.ownerDocument.createRange();
    range.setStart(textNode, textNode.textContent.replace(/[\s\u00a0]+$/, "").length);
    range.collapse(true);
    return range;
};

const isClickAfterCaretPosition = (event: MouseEvent, caretRange: Range, tolerance = 3): boolean => {
    const probe = expandRangeForClientRect(caretRange);
    const rects = probe.getClientRects();
    if (rects.length === 0) {
        return false;
    }
    const rect = rects[rects.length - 1];
    return event.clientX > rect.right + tolerance;
};

const shouldSkipImpreciseClickTarget = (target: HTMLElement): boolean => {
    if (target.tagName === "INPUT" || target.tagName === "IMG" || target.tagName === "A") {
        return true;
    }
    if (target.closest(".vditor-panel, .cm-editor, .vditor-wysiwyg__preview, .vditor-ir__preview, table")) {
        return true;
    }
    const blockElement = hasClosestBlock(target);
    if (blockElement && (blockElement as HTMLElement).closest("[data-type='code-block']")) {
        return true;
    }
    return false;
};

const getLineEndForImpreciseLineStartClick = (event: MouseEvent, editor: HTMLElement): Range | null => {
    if (event.button !== 0 || event.shiftKey) {
        return null;
    }
    const target = event.target as HTMLElement;
    if (shouldSkipImpreciseClickTarget(target)) {
        return null;
    }

    const doc = editor.ownerDocument;
    const clickRange = getCaretRangeFromPoint(doc, event.clientX, event.clientY);
    if (!clickRange || !editor.contains(clickRange.startContainer)) {
        return null;
    }

    const liElement = hasClosestByMatchTag(clickRange.startContainer, "LI");
    const isTaskListItem = !!(liElement && liElement.classList.contains("vditor-task"));

    if (liElement && !isTaskListItem) {
        const lineStartRange = getListItemLineStartRange(liElement);
        if (!lineStartRange || !isSameCaretPosition(clickRange, lineStartRange)) {
            return null;
        }
        if (isClickOnCaretGlyph(event, lineStartRange) || !isClickAfterCaretPosition(event, lineStartRange)) {
            return null;
        }
        const lineEndRange = getListItemLineEndRange(liElement);
        if (!lineEndRange || isSameCaretPosition(lineStartRange, lineEndRange)) {
            return null;
        }
        return lineEndRange;
    }

    const caretY = getRangeClientY(clickRange) ?? event.clientY;

    const editorRect = editor.getBoundingClientRect();
    const editorStyle = window.getComputedStyle(editor);
    const paddingLeft = parseFloat(editorStyle.paddingLeft) || 0;
    const paddingRight = parseFloat(editorStyle.paddingRight) || 0;
    const contentLeft = editorRect.left + paddingLeft;
    const contentRight = editorRect.right - paddingRight;

    const lineStartRange = getCaretRangeFromPoint(doc, contentLeft + 1, caretY);
    if (!lineStartRange) {
        return null;
    }
    if (!isSameCaretPosition(clickRange, lineStartRange)) {
        return null;
    }
    if (isClickOnCaretGlyph(event, lineStartRange)) {
        return null;
    }
    if (isTaskListItem) {
        const lineEndRange = getListItemLineEndRange(liElement);
        if (!lineEndRange || isSameCaretPosition(lineStartRange, lineEndRange)) {
            return null;
        }
        return lineEndRange;
    }
    const lineEndRange = getCaretRangeFromPoint(doc, contentRight - 1, caretY);
    if (!lineEndRange || isSameCaretPosition(lineStartRange, lineEndRange)) {
        return null;
    }
    return lineEndRange;
};

/** mousedown 捕获：非精确点击会落行首时，阻止默认行为并直接落到行尾 */
export const preventImpreciseLineStartClick = (event: MouseEvent, editor: HTMLElement): boolean => {
    const target = event.target;
    if (target instanceof Element && target.closest(".vditor-cm-chrome")) {
        return false;
    }
    const lineEndRange = getLineEndForImpreciseLineStartClick(event, editor);
    if (!lineEndRange) {
        return false;
    }
    event.preventDefault();
    editor.focus({ preventScroll: true });
    setSelectionFocus(lineEndRange);
    return true;
};
