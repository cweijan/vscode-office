import { isInsideCodeMirror } from "../codeBlock/codeMirrorManager";
import { expandMarkerWithMathSync } from "../ir/expandMarkerSync";
import { highlightToolbarIR } from "../ir/highlightToolbarIR";
import { processAfterRender } from "../ir/process";
import { afterRenderEvent } from "../wysiwyg/afterRenderEvent";
import { highlightToolbarWYSIWYG, moveDown, moveUp } from "../wysiwyg/highlightToolbarWYSIWYG";
import { removeTextCutBlock } from "./cutEmptySelection";
import { isCtrl } from "./compatibility";
import { insertEmptyBlock } from "./fixBrowserBehavior";
import {
    hasClosestBlock,
    hasClosestByAttribute,
    hasClosestByClassName,
    hasClosestByMatchTag,
} from "./hasClosest";
import { hasClosestByHeadings, hasClosestByTag } from "./hasClosestByHeadings";
import { getEditorRange, setRangeByWbr, setSelectionFocus } from "./selection";

const isTableCell = (startContainer: Node) => {
    return hasClosestByMatchTag(startContainer, "TD") || hasClosestByMatchTag(startContainer, "TH");
};

const getWysiwygBlockElement = (range: Range): HTMLElement | false => {
    const startContainer = range.startContainer;
    if (isTableCell(startContainer)) {
        return false;
    }
    const typeElement = startContainer as HTMLElement;
    return hasClosestByTag(typeElement, "BLOCKQUOTE") as HTMLElement
        || hasClosestByMatchTag(typeElement, "LI") as HTMLElement
        || hasClosestByMatchTag(typeElement, "TABLE") as HTMLElement
        || hasClosestByClassName(typeElement, "vditor-wysiwyg__block") as HTMLElement
        || hasClosestByHeadings(typeElement) as HTMLElement
        || hasClosestByAttribute(typeElement, "data-block", "0") as HTMLElement
        || false;
};

const getIrBlockElement = (range: Range): HTMLElement | false => {
    const startContainer = range.startContainer;
    if (isTableCell(startContainer)) {
        return false;
    }
    return hasClosestByTag(startContainer, "BLOCKQUOTE") as HTMLElement
        || hasClosestByMatchTag(startContainer, "LI") as HTMLElement
        || hasClosestByMatchTag(startContainer, "TABLE") as HTMLElement
        || hasClosestByAttribute(startContainer, "data-type", "code-block") as HTMLElement
        || hasClosestByAttribute(startContainer, "data-type", "math-block") as HTMLElement
        || hasClosestByHeadings(startContainer) as HTMLElement
        || hasClosestByAttribute(startContainer, "data-block", "0") as HTMLElement
        || hasClosestBlock(startContainer) as HTMLElement
        || false;
};

const getBlockElement = (range: Range, vditor: IVditor): HTMLElement | false => {
    if (vditor.currentMode === "wysiwyg") {
        return getWysiwygBlockElement(range);
    }
    if (vditor.currentMode === "ir") {
        return getIrBlockElement(range);
    }
    return false;
};

const getEditorElement = (vditor: IVditor) => {
    return vditor[vditor.currentMode].element as HTMLElement;
};

const canMoveBlockAmongSiblings = (element: HTMLElement, editorElement: HTMLElement) => {
    if (!element.parentElement) {
        return false;
    }
    if (element.tagName === "LI") {
        return true;
    }
    return element.parentElement.isEqualNode(editorElement);
};

const afterBlockChange = (vditor: IVditor) => {
    if (vditor.currentMode === "wysiwyg") {
        afterRenderEvent(vditor);
        highlightToolbarWYSIWYG(vditor);
    } else if (vditor.currentMode === "ir") {
        processAfterRender(vditor);
        highlightToolbarIR(vditor);
    }
};

const moveIrBlock = (range: Range, vditor: IVditor, direction: "up" | "down") => {
    const element = getIrBlockElement(range);
    if (!element) {
        return false;
    }
    const editorElement = vditor.ir.element;
    if (!canMoveBlockAmongSiblings(element, editorElement)) {
        return false;
    }

    const sibling = direction === "up" ?
        element.previousElementSibling :
        element.nextElementSibling;
    if (!sibling) {
        return false;
    }

    range.insertNode(document.createElement("wbr"));
    if (direction === "up") {
        sibling.insertAdjacentElement("beforebegin", element);
    } else {
        sibling.insertAdjacentElement("afterend", element);
    }
    setRangeByWbr(editorElement, range);
    afterBlockChange(vditor);
    return true;
};

const copyBlock = (range: Range, vditor: IVditor, direction: "up" | "down") => {
    const element = getBlockElement(range, vditor);
    if (!element) {
        return false;
    }

    const clone = element.cloneNode(true) as HTMLElement;
    range.insertNode(document.createElement("wbr"));
    if (direction === "up") {
        element.insertAdjacentElement("beforebegin", clone);
    } else {
        element.insertAdjacentElement("afterend", clone);
    }
    setRangeByWbr(getEditorElement(vditor), range);
    afterBlockChange(vditor);
    return true;
};

const deleteBlock = (vditor: IVditor, range: Range) => {
    const blockElement = getBlockElement(range, vditor);
    if (!blockElement) {
        return false;
    }
    removeTextCutBlock(vditor, blockElement);
    return true;
};

const selectBlock = (range: Range, vditor: IVditor) => {
    const startContainer = range.startContainer;
    const cellElement = isTableCell(startContainer) ?
        (hasClosestByMatchTag(startContainer, "TD") || hasClosestByMatchTag(startContainer, "TH")) :
        false;
    const blockElement = cellElement || getBlockElement(range, vditor);
    if (!blockElement) {
        return false;
    }

    range.selectNodeContents(blockElement as HTMLElement);
    setSelectionFocus(range);
    if (vditor.currentMode === "ir") {
        expandMarkerWithMathSync(range, vditor);
        highlightToolbarIR(vditor);
    } else if (vditor.currentMode === "wysiwyg") {
        highlightToolbarWYSIWYG(vditor);
    }
    return true;
};

/** VS Code 快捷键：Alt+↑/↓ 移动行，Shift+Alt+↑/↓ 复制行，Shift+Ctrl+K 删除行，Ctrl+L 选中行，Ctrl+Enter 插入空行 */
export const handleVscodeShortcut = (vditor: IVditor, event: KeyboardEvent): boolean => {
    if (event.isComposing) {
        return false;
    }

    if (isInsideCodeMirror(event.target)) {
        return false;
    }

    if (vditor.currentMode !== "wysiwyg" && vditor.currentMode !== "ir") {
        return false;
    }

    const range = getEditorRange(vditor);

    if (!isCtrl(event) && event.shiftKey && event.altKey &&
        (event.key === "ArrowUp" || event.key === "ArrowDown")) {
        const copied = copyBlock(range, vditor, event.key === "ArrowUp" ? "up" : "down");
        if (!copied) {
            return false;
        }
        event.preventDefault();
        event.stopPropagation();
        return true;
    }

    if (isCtrl(event) && !event.shiftKey && !event.altKey &&
        (event.key === "l" || event.key === "L")) {
        if (!selectBlock(range, vditor)) {
            return false;
        }
        event.preventDefault();
        event.stopPropagation();
        return true;
    }

    if (isCtrl(event) && event.shiftKey && !event.altKey &&
        (event.key === "k" || event.key === "K")) {
        if (!deleteBlock(vditor, range)) {
            return false;
        }
        event.preventDefault();
        event.stopPropagation();
        return true;
    }

    if (!isCtrl(event) && !event.shiftKey && event.altKey &&
        (event.key === "ArrowUp" || event.key === "ArrowDown")) {
        if (vditor.currentMode === "wysiwyg") {
            if (event.key === "ArrowUp") {
                moveUp(range, vditor);
            } else {
                moveDown(range, vditor);
            }
        } else if (!moveIrBlock(range, vditor, event.key === "ArrowUp" ? "up" : "down")) {
            return false;
        }
        event.preventDefault();
        event.stopPropagation();
        return true;
    }

    if (isCtrl(event) && event.key === "Enter") {
        insertEmptyBlock(vditor, event.shiftKey ? "beforebegin" : "afterend");
        event.preventDefault();
        event.stopPropagation();
        return true;
    }

    return false;
};
