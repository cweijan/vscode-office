import { processAfterRender } from "../ir/process";
import { afterRenderEvent } from "../wysiwyg/afterRenderEvent";
import { clearHistoryInputBuffer } from "./historyInputBufferState";

export const clearPendingHistoryTimeout = (vditor: IVditor) => {
    if (vditor.currentMode === "wysiwyg") {
        clearTimeout(vditor.wysiwyg.afterRenderTimeoutId);
    } else if (vditor.currentMode === "ir") {
        clearTimeout(vditor.ir.processTimeoutId);
    }
};

const clearHistoryTimeout = clearPendingHistoryTimeout;

export const recordHistoryPosition = (vditor: IVditor) => {
    clearHistoryTimeout(vditor);
    clearHistoryInputBuffer(vditor);
    vditor.undo.addToUndoStack(vditor);
};

export const recordHistoryChange = (vditor: IVditor, enableHint = false) => {
    clearHistoryTimeout(vditor);
    clearHistoryInputBuffer(vditor);
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
