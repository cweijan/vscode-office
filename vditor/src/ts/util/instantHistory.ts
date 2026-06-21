import { processAfterRender } from "../ir/process";
import { afterRenderEvent } from "../wysiwyg/afterRenderEvent";

const clearHistoryTimeout = (vditor: IVditor) => {
    if (vditor.currentMode === "wysiwyg") {
        clearTimeout(vditor.wysiwyg.afterRenderTimeoutId);
    } else if (vditor.currentMode === "ir") {
        clearTimeout(vditor.ir.processTimeoutId);
    }
};

export const recordHistoryPosition = (vditor: IVditor) => {
    clearHistoryTimeout(vditor);
    vditor.undo.addToUndoStack(vditor);
};

export const recordHistoryChange = (vditor: IVditor, enableHint = false) => {
    clearHistoryTimeout(vditor);
    vditor.undo.addToUndoStack(vditor);
    if (vditor.currentMode === "wysiwyg") {
        afterRenderEvent(vditor, {
            enableAddUndoStack: false,
            enableHint,
            enableInput: true,
        });
    } else if (vditor.currentMode === "ir") {
        processAfterRender(vditor, {
            enableAddUndoStack: false,
            enableHint,
            enableInput: true,
        });
    }
};

export const isDeleteInput = (event: InputEvent) => {
    return event.inputType.indexOf("delete") === 0 &&
        event.inputType !== "deleteByCut" &&
        event.inputType !== "deleteByDrag";
};
