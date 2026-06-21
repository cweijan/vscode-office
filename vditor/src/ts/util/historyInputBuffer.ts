import { recordHistory as recordIrHistory } from "../ir/process";
import { recordHistory as recordWysiwygHistory } from "../wysiwyg/afterRenderEvent";
import { clearPendingHistoryTimeout } from "./instantHistory";
import {
    clearHistoryInputBuffer,
    historyInputBufferHasText,
    trackHistoryInputFromEvent,
    trackHistoryInputFromText,
} from "./historyInputBufferState";

export {
    clearHistoryInputBuffer,
    historyInputBufferHasText,
    trackHistoryInputFromEvent,
    trackHistoryInputFromText,
} from "./historyInputBufferState";

const defaultRecordOptions = {
    enableAddUndoStack: true,
    enableHint: false,
    enableInput: true,
};

export const flushBufferedHistory = (vditor: IVditor, options = defaultRecordOptions) => {
    clearPendingHistoryTimeout(vditor);
    if (vditor.currentMode === "wysiwyg") {
        recordWysiwygHistory(vditor, options);
    } else if (vditor.currentMode === "ir") {
        recordIrHistory(vditor, options);
    }
};

export const flushBufferedHistoryOnClick = (vditor: IVditor) => {
    if (!historyInputBufferHasText(vditor)) {
        return;
    }
    flushBufferedHistory(vditor);
};

export const bindHistoryInputBufferClick = (vditor: IVditor) => {
    vditor.element.addEventListener("mousedown", () => {
        flushBufferedHistoryOnClick(vditor);
    }, true);
};
