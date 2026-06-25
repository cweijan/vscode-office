import { syncIrMathBlockAfterExpand } from "../codeBlock/codeMirrorManager";
import { expandMarker } from "./expandMarker";

export const expandMarkerWithMathSync = (range: Range, vditor: IVditor) => {
    const root = vditor.currentMode === "wysiwyg" ? vditor.wysiwyg.element : vditor.ir.element;
    expandMarker(range, root);
    if (vditor.currentMode === "ir") {
        syncIrMathBlockAfterExpand(vditor, range);
    }
};
