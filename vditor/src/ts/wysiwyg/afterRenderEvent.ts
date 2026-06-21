import { getMarkdown } from "../markdown/getMarkdown";
import { saveCacheFocus } from "../util/cacheFocus";
import { accessLocalStorage } from "../util/compatibility";
import { clearHistoryInputBuffer } from "../util/historyInputBufferState";
import { getHistoryRecordWait } from "../util/historySchedule";
import { matchHotkeyNew } from "../util/hotKey";
import { formatMs, logPerf } from "../util/log";


export function handlerHistoryEvent(event: KeyboardEvent, vditor: IVditor,): boolean {

    if (matchHotkeyNew("^s", event) || matchHotkeyNew("^x", event)) {
        clearTimeout(vditor.wysiwyg.afterRenderTimeoutId);
        recordHistory(vditor)
    }

    return false;
}

export const afterRenderEvent = (vditor: IVditor, options = {
    enableAddUndoStack: true,
    enableHint: false,
    enableInput: true,
}) => {
    if (options.enableHint) {
        vditor.hint.render(vditor);
    }
    clearTimeout(vditor.wysiwyg.afterRenderTimeoutId);
    const wait = getHistoryRecordWait(vditor.wysiwyg.afterRenderLastAt, vditor.options.undoDelay);
    vditor.wysiwyg.afterRenderTimeoutId = window.setTimeout(() => {
        recordHistory(vditor, options);
    }, wait);
};

export function recordHistory(vditor: IVditor, options = { enableAddUndoStack: true, enableInput: true, }) {
    if (vditor.wysiwyg.composingLock) {
        return;
    }

    const debug = vditor.options.debugger;
    const totalStart = debug ? performance.now() : 0;

    let stepStart = debug ? performance.now() : 0;
    const text = getMarkdown(vditor);
    const getMarkdownMs = debug ? performance.now() - stepStart : 0;

    stepStart = debug ? performance.now() : 0;
    if (typeof vditor.options.input === "function" && options.enableInput) {
        vditor.options.input(text);
    }
    const inputCallbackMs = debug ? performance.now() - stepStart : 0;

    stepStart = debug ? performance.now() : 0;
    if (vditor.options.counter.enable) {
        vditor.counter.render(vditor, text);
    }

    if (vditor.options.cache.enable && accessLocalStorage()) {
        localStorage.setItem(vditor.options.cache.id, text);
        saveCacheFocus(vditor);
        if (vditor.options.cache.after) {
            vditor.options.cache.after(text);
        }
    }
    const cacheAndCounterMs = debug ? performance.now() - stepStart : 0;

    stepStart = debug ? performance.now() : 0;
    if (options.enableAddUndoStack) {
        vditor.undo.addToUndoStack(vditor);
    }
    const undoStackMs = debug ? performance.now() - stepStart : 0;

    logPerf(debug, "[vditor input] recordHistory", {
        getMarkdownMs: formatMs(getMarkdownMs),
        inputCallbackMs: formatMs(inputCallbackMs),
        cacheAndCounterMs: formatMs(cacheAndCounterMs),
        undoStackMs: formatMs(undoStackMs),
        totalMs: formatMs(debug ? performance.now() - totalStart : 0),
    });

    vditor.wysiwyg.afterRenderLastAt = Date.now();
    clearHistoryInputBuffer(vditor);
}
