import { getMarkdown } from "../markdown/getMarkdown";
import { accessLocalStorage } from "../util/compatibility";
import { matchHotkeyNew } from "../util/hotKey";


export function handlerHistoryEvent(event: KeyboardEvent, vditor: IVditor,): boolean {

    if (matchHotkeyNew("^s", event) || matchHotkeyNew("^x", event) || matchHotkeyNew("^v", event)) {
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
    vditor.wysiwyg.afterRenderTimeoutId = window.setTimeout(() => {
        recordHistory(vditor, options)
    }, vditor.options.undoDelay);
};

function recordHistory(vditor: IVditor, options = { enableAddUndoStack: true, enableInput: true, }) {
    if (vditor.wysiwyg.composingLock) {
        return;
    }
    const text = getMarkdown(vditor);
    if (typeof vditor.options.input === "function" && options.enableInput) {
        vditor.options.input(text);
    }

    if (vditor.options.counter.enable) {
        vditor.counter.render(vditor, text);
    }

    if (vditor.options.cache.enable && accessLocalStorage()) {
        localStorage.setItem(vditor.options.cache.id, text);
        if (vditor.options.cache.after) {
            vditor.options.cache.after(text);
        }
    }

    if (vditor.devtools) {
        vditor.devtools.renderEchart(vditor);
    }

    if (options.enableAddUndoStack) {
        vditor.undo.addToUndoStack(vditor);
    }
}