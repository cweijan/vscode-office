export const getElement = (vditor: IVditor) => {
    if (vditor.currentMode === "wysiwyg") {
        return vditor.wysiwyg.element;
    }
    if (vditor.currentMode === "raw") {
        return vditor.raw.element;
    }
    return vditor.ir.element;
};
