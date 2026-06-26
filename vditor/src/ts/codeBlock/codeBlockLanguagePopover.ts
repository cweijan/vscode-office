export const getModePopover = (vditor: IVditor) => {
    if (vditor.currentMode === "wysiwyg") {
        return vditor.wysiwyg.popover;
    }
    if (vditor.currentMode === "ir") {
        return vditor.ir.popover;
    }
    return null;
};

export const getModeEditorElement = (vditor: IVditor) => {
    if (vditor.currentMode === "wysiwyg") {
        return vditor.wysiwyg.element;
    }
    if (vditor.currentMode === "ir") {
        return vditor.ir.element;
    }
    return null;
};
