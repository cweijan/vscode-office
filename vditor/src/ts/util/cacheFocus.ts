import { getCodeMirrorView, isInsideCodeMirror, restoreCodeMirrorFocus } from "../codeBlock/codeMirrorManager";
import { accessLocalStorage } from "./compatibility";
import { getEditorRange, getEditorTextOffset, setSelectionByPosition } from "./selection";

type CacheFocusState = {
    mode: string;
    type: "editor" | "cm";
    start: number;
    end: number;
    scrollTop: number;
    blockIndex?: number;
};

const cacheRestoredMap = new WeakMap<IVditor, boolean>();

export const getCacheFocusKey = (cacheId: string) => `${cacheId}-focus`;

export const markCacheContentRestored = (vditor: IVditor) => {
    cacheRestoredMap.set(vditor, true);
};

export const wasCacheContentRestored = (vditor: IVditor) => {
    return cacheRestoredMap.get(vditor) === true;
};

export const clearCacheFocus = (cacheId: string) => {
    if (!accessLocalStorage()) {
        return;
    }
    localStorage.removeItem(getCacheFocusKey(cacheId));
};

const getCodeBlockIndex = (editor: HTMLElement, block: HTMLElement) => {
    const blocks = editor.querySelectorAll("[data-type='code-block']");
    let blockIndex = -1;
    let index = 0;
    for (const element of blocks) {
        if (element === block) {
            blockIndex = index;
            break;
        }
        index++;
    }
    return blockIndex;
};

export const saveCacheFocus = (vditor: IVditor) => {
    if (!vditor.options.cache.enable || !accessLocalStorage()) {
        return;
    }

    const editor = vditor[vditor.currentMode].element;
    const scrollTop = editor.scrollTop;
    const activeElement = document.activeElement;

    if (isInsideCodeMirror(activeElement)) {
        const block = activeElement?.closest("[data-type='code-block']") as HTMLElement | null;
        if (block) {
            const blockIndex = getCodeBlockIndex(editor, block);
            const view = getCodeMirrorView(block);
            if (view && blockIndex >= 0) {
                const selection = view.state.selection.main;
                const state: CacheFocusState = {
                    mode: vditor.currentMode,
                    type: "cm",
                    start: selection.anchor,
                    end: selection.head,
                    scrollTop,
                    blockIndex,
                };
                localStorage.setItem(getCacheFocusKey(vditor.options.cache.id), JSON.stringify(state));
                return;
            }
        }
    }

    const range = getEditorRange(vditor);
    const { start, end } = getEditorTextOffset(editor, range);
    const state: CacheFocusState = {
        mode: vditor.currentMode,
        type: "editor",
        start,
        end,
        scrollTop,
    };
    localStorage.setItem(getCacheFocusKey(vditor.options.cache.id), JSON.stringify(state));
};

export const restoreCacheFocus = (vditor: IVditor) => {
    if (!vditor.options.cache.enable || !wasCacheContentRestored(vditor) || !accessLocalStorage()) {
        return;
    }
    cacheRestoredMap.delete(vditor);

    const raw = localStorage.getItem(getCacheFocusKey(vditor.options.cache.id));
    if (!raw) {
        return;
    }

    let state: CacheFocusState;
    try {
        state = JSON.parse(raw);
    } catch {
        return;
    }

    if (state.mode !== vditor.currentMode) {
        return;
    }

    const editor = vditor[vditor.currentMode].element;
    const apply = () => {
        if (state.scrollTop != null && !Number.isNaN(state.scrollTop)) {
            editor.scrollTop = state.scrollTop;
        }

        if (state.type === "cm" && state.blockIndex != null && state.blockIndex >= 0) {
            const blocks = editor.querySelectorAll("[data-type='code-block']");
            const block = blocks[state.blockIndex] as HTMLElement | undefined;
            if (block) {
                restoreCodeMirrorFocus(block, state.start, state.end, vditor);
            }
            return;
        }

        const start = Math.max(0, state.start);
        const end = Math.max(start, state.end);
        editor.focus({ preventScroll: true });
        setSelectionByPosition(start, end, editor);
    };

    window.requestAnimationFrame(() => {
        window.requestAnimationFrame(apply);
    });
};

export const bindCacheFocusPersistence = (vditor: IVditor) => {
    if (!vditor.options.cache.enable || !accessLocalStorage()) {
        return;
    }
    const persistFocus = () => saveCacheFocus(vditor);
    window.addEventListener("pagehide", persistFocus);
    window.addEventListener("beforeunload", persistFocus);
};
