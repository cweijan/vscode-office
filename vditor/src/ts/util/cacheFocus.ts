import { getCodeMirrorView, isInsideCodeBlockChrome, isInsideCodeMirror, restoreCodeMirrorFocus } from "../codeBlock/codeMirrorManager";
import { accessLocalStorage } from "./compatibility";
import { getEditorRange, getEditorTextOffset, setSelectionByPosition } from "./selection";

type CacheFocusState = {
    mode: string;
    type: "editor" | "cm";
    start: number;
    end: number;
    scrollTop?: number;
    blockIndex?: number;
};

type RestoreFocusOptions = {
    /** 页面/文档首次加载时恢复（读取持久化焦点，不依赖本次会话是否失焦过） */
    onLoad?: boolean;
};

const cacheRestoredMap = new WeakMap<IVditor, boolean>();
const sessionFocusMap = new WeakMap<IVditor, CacheFocusState>();
const focusSavedMap = new WeakMap<IVditor, boolean>();

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

const isVscodeFocusHost = (vditor: IVditor) => {
    return vditor.options.cache?.focusHost === "vscode";
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

const persistFocusState = (vditor: IVditor, state: CacheFocusState) => {
    sessionFocusMap.set(vditor, state);
    focusSavedMap.set(vditor, true);
    if (accessLocalStorage() && vditor.options.cache?.id) {
        localStorage.setItem(getCacheFocusKey(vditor.options.cache.id), JSON.stringify(state));
    }
};

const readFocusState = (vditor: IVditor): CacheFocusState | null => {
    const cached = sessionFocusMap.get(vditor);
    if (cached) {
        return cached;
    }
    if (!accessLocalStorage() || !vditor.options.cache?.id) {
        return null;
    }
    const raw = localStorage.getItem(getCacheFocusKey(vditor.options.cache.id));
    if (!raw) {
        return null;
    }
    try {
        return JSON.parse(raw) as CacheFocusState;
    } catch {
        return null;
    }
};

const isEditorFocused = (vditor: IVditor) => {
    const editor = vditor[vditor.currentMode].element;
    const activeElement = document.activeElement;
    if (!activeElement) {
        return false;
    }
    return editor.contains(activeElement)
        || isInsideCodeMirror(activeElement)
        || isInsideCodeBlockChrome(activeElement);
};

const canRestoreFocus = (vditor: IVditor, onLoad: boolean) => {
    if (onLoad) {
        return true;
    }
    return focusSavedMap.get(vditor) === true || wasCacheContentRestored(vditor);
};

const applyFocusState = (vditor: IVditor, state: CacheFocusState, options?: RestoreFocusOptions) => {
    const editor = vditor[vditor.currentMode].element;
    const onLoad = options?.onLoad === true;
    if (onLoad && !isVscodeFocusHost(vditor) &&
        state.scrollTop != null && !Number.isNaN(state.scrollTop)) {
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

export const saveCacheFocus = (vditor: IVditor) => {
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
                persistFocusState(vditor, {
                    mode: vditor.currentMode,
                    type: "cm",
                    start: selection.anchor,
                    end: selection.head,
                    scrollTop,
                    blockIndex,
                });
                return;
            }
        }
    }

    const range = getEditorRange(vditor);
    const { start, end } = getEditorTextOffset(editor, range);
    persistFocusState(vditor, {
        mode: vditor.currentMode,
        type: "editor",
        start,
        end,
        scrollTop,
    });
};

export const restoreCacheFocus = (vditor: IVditor, options?: RestoreFocusOptions) => {
    const onLoad = options?.onLoad === true;
    if (!canRestoreFocus(vditor, onLoad)) {
        return;
    }
    if (wasCacheContentRestored(vditor)) {
        cacheRestoredMap.delete(vditor);
    }

    const state = readFocusState(vditor);
    if (!state || state.mode !== vditor.currentMode) {
        return;
    }

    if (onLoad || focusSavedMap.get(vditor) === true) {
        focusSavedMap.set(vditor, true);
    }

    const apply = () => {
        applyFocusState(vditor, state, options);
    };

    window.requestAnimationFrame(() => {
        window.requestAnimationFrame(apply);
    });
};

export const bindCacheFocusPersistence = (vditor: IVditor) => {
    const persistFocus = () => saveCacheFocus(vditor);
    const tryRestoreFocus = () => {
        if (isEditorFocused(vditor)) {
            return;
        }
        restoreCacheFocus(vditor);
    };

    window.addEventListener("pagehide", persistFocus);
    window.addEventListener("beforeunload", persistFocus);

    if (!isVscodeFocusHost(vditor)) {
        return;
    }

    window.addEventListener("blur", persistFocus);
    window.addEventListener("focus", tryRestoreFocus);
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            persistFocus();
            return;
        }
        tryRestoreFocus();
    });
};
