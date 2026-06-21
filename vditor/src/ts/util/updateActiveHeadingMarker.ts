import {isInsideCodeBlockChrome, isInsideCodeMirror} from "../codeBlock/codeMirrorManager";
import {clearBlockMarkerTop, syncBlockMarkerTop} from "./blockMarker";
import {hasClosestByClassName, hasTopClosestByAttribute} from "./hasClosest";
import {hasClosestByHeadings} from "./hasClosestByHeadings";
import {getEditorRange, selectIsEditor} from "./selection";

const ACTIVE_CLASS = "vditor-heading--active";
const MATH_BLOCK_ACTIVE_CLASS = "vditor-math-block--active";

const isEditorAreaFocused = (vditor: IVditor) => {
    const activeElement = document.activeElement;
    if (!activeElement) {
        return false;
    }
    const editorElement = vditor[vditor.currentMode].element;
    if (editorElement.isEqualNode(activeElement) || editorElement.contains(activeElement)) {
        return true;
    }
    const editorRoot = editorElement.parentElement;
    if (editorRoot?.contains(activeElement)) {
        return true;
    }
    return isInsideCodeMirror(activeElement) || isInsideCodeBlockChrome(activeElement);
};

export const clearActiveHeadingMarker = (vditor: IVditor) => {
    if (vditor.currentMode !== "wysiwyg" && vditor.currentMode !== "ir") {
        return;
    }
    const editorElement = vditor[vditor.currentMode].element;
    for (const item of editorElement.querySelectorAll(`.${ACTIVE_CLASS}`)) {
        clearBlockMarkerTop(item as HTMLElement);
        item.classList.remove(ACTIVE_CLASS);
    }
    if (vditor.currentMode === "wysiwyg") {
        for (const item of editorElement.querySelectorAll(`.${MATH_BLOCK_ACTIVE_CLASS}`)) {
            clearBlockMarkerTop(item as HTMLElement);
            item.classList.remove(MATH_BLOCK_ACTIVE_CLASS);
        }
    }
};

export const updateActiveHeadingMarker = (vditor: IVditor) => {
    if (vditor.currentMode !== "wysiwyg" && vditor.currentMode !== "ir") {
        return;
    }
    const editorElement = vditor[vditor.currentMode].element;
    clearActiveHeadingMarker(vditor);
    if (!selectIsEditor(editorElement) || !isEditorAreaFocused(vditor)) {
        return;
    }

    const range = getEditorRange(vditor);
    let typeElement = range.startContainer as HTMLElement;
    if (range.startContainer.nodeType === 3) {
        typeElement = range.startContainer.parentElement;
    }

    const headingElement = hasClosestByHeadings(typeElement) as HTMLElement | false;
    if (headingElement && editorElement.contains(headingElement) && headingElement.parentElement === editorElement) {
        headingElement.classList.add(ACTIVE_CLASS);
        syncBlockMarkerTop(headingElement);
    }

    if (vditor.currentMode === "wysiwyg" && !hasClosestByClassName(typeElement, "vditor-wysiwyg__preview")) {
        const mathBlockElement = hasTopClosestByAttribute(typeElement, "data-type", "math-block") as HTMLElement | false;
        if (mathBlockElement
            && mathBlockElement.getAttribute("data-type") === "math-block"
            && mathBlockElement.classList.contains("vditor-wysiwyg__block")
            && editorElement.contains(mathBlockElement)) {
            mathBlockElement.classList.add(MATH_BLOCK_ACTIVE_CLASS);
            syncBlockMarkerTop(mathBlockElement);
        }
    }
};
