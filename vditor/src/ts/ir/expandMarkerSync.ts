import { syncIrMathBlockAfterExpand } from "../codeBlock/codeMirrorManager";
import { expandMarker } from "./expandMarker";

export const expandMarkerWithMathSync = (range: Range, vditor: IVditor) => {
    expandMarker(range, vditor);
    syncIrMathBlockAfterExpand(vditor, range);
};
