import { Constants } from "../constants";
import { isInsideCodeMirror } from "../codeBlock/codeMirrorManager";
import { expandMarker } from "../ir/expandMarker";
import { hasClosestByClassName } from "./hasClosest";
import { recordHistoryChange, recordHistoryPosition } from "./instantHistory";
import { getEditorRange, setRangeByWbr, setSelectionFocus } from "./selection";

const SKIP_CUT_DATA_TYPES = new Set([
    "code-block",
    "math-block",
    "html-block",
    "toc-block",
    "link-ref-defs-block",
    "footnotes-block",
    "yaml-front-matter",
]);

const CODE_BLOCK_DATA_TYPES = new Set(["code-block"]);

const TEXT_BLOCK_TAGS = new Set([
    "P", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE", "LI",
]);

const LIST_TAGS = new Set(["OL", "UL"]);

const hasDataType = (element: HTMLElement, dataTypes: Set<string>) => {
    const dataType = element.getAttribute("data-type");
    return !!dataType && dataType.split(/\s+/).some((type) => dataTypes.has(type));
};

const isSkipSpecialElement = (element: HTMLElement) => {
    return hasDataType(element, SKIP_CUT_DATA_TYPES);
};

const hasClosestByDataType = (node: Node, dataTypes: Set<string>) => {
    if (!node) {
        return false;
    }
    if (node.nodeType === 3) {
        node = node.parentElement;
    }
    let element = node as HTMLElement;
    while (element && !element.classList.contains("vditor-reset")) {
        if (hasDataType(element, dataTypes)) {
            return element;
        }
        element = element.parentElement;
    }
    return false;
};

const getElement = (node: Node): HTMLElement | null => {
    if (!node) {
        return null;
    }
    if (node.nodeType === 3) {
        return node.parentElement;
    }
    return node as HTMLElement;
};

const findMarkdownCutBlock = (node: Node): HTMLElement | null => {
    let element = getElement(node);
    let nearestTextBlock: HTMLElement | null = null;
    while (element && !element.classList.contains("vditor-reset")) {
        if (element.tagName === "LI") {
            return element;
        }
        if (!nearestTextBlock && TEXT_BLOCK_TAGS.has(element.tagName)) {
            nearestTextBlock = element;
        }
        if (element.getAttribute("data-block") === "0") {
            return nearestTextBlock || element;
        }
        element = element.parentElement;
    }
    return nearestTextBlock;
};

const isFenceStartBlock = (element: HTMLElement) => {
    const text = (element.textContent || "").replace(Constants.ZWSP, "").trimLeft();
    return text.startsWith("```") || text.startsWith("$$");
};

const hasListItem = (element: HTMLElement) => {
    for (let i = 0; i < element.children.length; i++) {
        if ((element.children[i] as HTMLElement).tagName === "LI") {
            return true;
        }
    }
    return false;
};

/** 无选区时解析可剪切的 Markdown 块；特殊块（公式、代码块等）返回 null */
export const resolveTextCutBlock = (event: ClipboardEvent): HTMLElement | null => {
    if (isInsideCodeMirror(event.target)) {
        return null;
    }

    const selection = window.getSelection();
    if (!selection?.rangeCount) {
        return null;
    }
    const range = selection.getRangeAt(0);
    if (range.toString() !== "") {
        return null;
    }

    const specialBlock = hasClosestByClassName(range.startContainer, "vditor-wysiwyg__block");
    if (specialBlock && isSkipSpecialElement(specialBlock)) {
        return null;
    }
    if (hasClosestByDataType(range.startContainer, CODE_BLOCK_DATA_TYPES)) {
        return null;
    }

    const blockElement = findMarkdownCutBlock(range.startContainer);
    if (!blockElement || blockElement.classList.contains("vditor-wysiwyg__block") ||
        isSkipSpecialElement(blockElement) || !TEXT_BLOCK_TAGS.has(blockElement.tagName) ||
        isFenceStartBlock(blockElement)) {
        return null;
    }

    return blockElement;
};

const getTextCutBlockClipboardHTML = (blockElement: HTMLElement) => {
    if (blockElement.tagName !== "LI") {
        return blockElement.outerHTML;
    }

    const parentList = blockElement.parentElement;
    if (!parentList || !LIST_TAGS.has(parentList.tagName)) {
        return blockElement.outerHTML;
    }
    const listClone = parentList.cloneNode(false) as HTMLElement;
    listClone.appendChild(blockElement.cloneNode(true));
    const tempElement = document.createElement("div");
    tempElement.appendChild(listClone);
    return tempElement.innerHTML;
};

/** 整行剪切统一按块 DOM 转 Markdown，列表项需带父级列表上下文 */
export const copyTextCutBlock = (event: ClipboardEvent, vditor: IVditor, blockElement: HTMLElement) => {
    if (!event.clipboardData) {
        return false;
    }
    event.stopPropagation();
    event.preventDefault();

    const html = getTextCutBlockClipboardHTML(blockElement);
    const text = vditor.currentMode === "ir" ?
        vditor.lute.VditorIRDOM2Md(html).trim() :
        vditor.lute.VditorDOM2Md(html).trim();
    event.clipboardData.setData("text/plain", text);
    event.clipboardData.setData("text/html", "");
    return true;
};

/** 剪切后删除整块并恢复光标 */
export const removeTextCutBlock = (vditor: IVditor, blockElement: HTMLElement) => {
    const editor = vditor[vditor.currentMode].element;
    const parentList = blockElement.tagName === "LI" && blockElement.parentElement &&
        LIST_TAGS.has(blockElement.parentElement.tagName) ? blockElement.parentElement : null;
    let previousElement = blockElement.previousElementSibling as HTMLElement | null;
    let nextElement = blockElement.nextElementSibling as HTMLElement | null;
    let fallbackElement = parentList?.parentElement?.tagName === "LI" ?
        parentList.parentElement as HTMLElement : null;

    recordHistoryPosition(vditor);

    blockElement.remove();

    if (parentList && !hasListItem(parentList)) {
        previousElement = previousElement || (parentList.previousElementSibling as HTMLElement | null);
        nextElement = nextElement || (parentList.nextElementSibling as HTMLElement | null);
        fallbackElement = fallbackElement ||
            (parentList.parentElement?.classList.contains("vditor-reset") ?
                null : parentList.parentElement as HTMLElement | null);
        parentList.remove();
    }

    const range = getEditorRange(vditor);
    if (previousElement) {
        range.selectNodeContents(previousElement);
        range.collapse(false);
        setSelectionFocus(range);
        if (vditor.currentMode === "ir") {
            expandMarker(range, vditor);
        }
    } else if (nextElement) {
        range.selectNodeContents(nextElement);
        range.collapse(true);
        setSelectionFocus(range);
        if (vditor.currentMode === "ir") {
            expandMarker(range, vditor);
        }
    } else if (fallbackElement) {
        range.selectNodeContents(fallbackElement);
        range.collapse(false);
        setSelectionFocus(range);
        if (vditor.currentMode === "ir") {
            expandMarker(range, vditor);
        }
    } else {
        editor.insertAdjacentHTML("beforeend", `<p data-block="0">${Constants.ZWSP}<wbr></p>`);
        setRangeByWbr(editor, range);
        setSelectionFocus(range);
    }

    recordHistoryChange(vditor);
};
