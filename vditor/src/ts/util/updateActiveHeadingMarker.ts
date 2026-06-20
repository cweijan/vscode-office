import {hasClosestByHeadings} from "./hasClosestByHeadings";
import {getEditorRange, selectIsEditor} from "./selection";

const ACTIVE_CLASS = "vditor-heading--active";

export const clearActiveHeadingMarker = (vditor: IVditor) => {
    if (vditor.currentMode !== "wysiwyg" && vditor.currentMode !== "ir") {
        return;
    }
    const editorElement = vditor[vditor.currentMode].element;
    for (const item of editorElement.querySelectorAll(`.${ACTIVE_CLASS}`)) {
        item.classList.remove(ACTIVE_CLASS);
    }
};

export const updateActiveHeadingMarker = (vditor: IVditor) => {
    if (vditor.currentMode !== "wysiwyg" && vditor.currentMode !== "ir") {
        return;
    }
    const editorElement = vditor[vditor.currentMode].element;
    clearActiveHeadingMarker(vditor);
    if (!selectIsEditor(editorElement)) {
        return;
    }

    const range = getEditorRange(vditor);
    let typeElement = range.startContainer as HTMLElement;
    if (range.startContainer.nodeType === 3) {
        typeElement = range.startContainer.parentElement;
    }

    const headingElement = hasClosestByHeadings(typeElement) as HTMLElement | false;
    if (!headingElement || !editorElement.contains(headingElement)) {
        return;
    }
    if (headingElement.parentElement !== editorElement) {
        return;
    }
    headingElement.classList.add(ACTIVE_CLASS);
};
