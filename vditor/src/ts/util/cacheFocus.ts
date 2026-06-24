import { getCodeMirrorView, isInsideCodeBlockChrome, isInsideCodeMirror, restoreCodeMirrorFocus } from "../codeBlock/codeMirrorManager";
import { syncOutlineOnDocumentLoad } from "../outline/updateOutlineActive";
import { accessLocalStorage } from "./compatibility";
import { adjustEditorScrollBy, getFocusStateKey, restoreDocumentScroll } from "./documentState";
import {
    getEditorRange,
    getEditorTextOffset,
    getNodePath,
    getRangeCaretRect,
    getSelectionRangeInEditor,
    setSelectionByPath,
    setSelectionByPosition,
} from "./selection";

type CacheFocusState = {
    mode: string;
    type: "editor" | "cm";
    start: number;
    end: number;
    startOffset?: number;
    endOffset?: number;
    startPath?: number[];
    endPath?: number[];
    scrollTop?: number;
    blockIndex?: number;
    /** 光标相对编辑器可视区域顶部的距离；仅滚动时光标可见时记录 */
    caretViewportOffset?: number;
};

type RestoreFocusOptions = {
    /** 页面/文档首次加载时恢复（读取持久化焦点，不依赖本次会话是否失焦过） */
    onLoad?: boolean;
};

type CaretViewportMetrics = {
    offset: number;
    visible: boolean;
};

const cacheRestoredMap = new WeakMap<IVditor, boolean>();
const sessionFocusMap = new WeakMap<IVditor, CacheFocusState>();
const focusSavedMap = new WeakMap<IVditor, boolean>();

export const getCacheFocusKey = (cacheId: string) => getFocusStateKey(cacheId);

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

const rectToCaretViewportMetrics = (editor: HTMLElement, top: number, bottom: number): CaretViewportMetrics => {
    const editorRect = editor.getBoundingClientRect();
    const visible = bottom > editorRect.top && top < editorRect.bottom;
    return {
        visible,
        offset: top - editorRect.top,
    };
};

const getCodeMirrorCaretViewportMetrics = (editor: HTMLElement, block: HTMLElement): CaretViewportMetrics | null => {
    const view = getCodeMirrorView(block);
    if (!view) {
        return null;
    }
    const pos = view.state.selection.main.head;
    const coords = view.coordsAtPos(pos, 1);
    if (!coords) {
        return null;
    }
    return rectToCaretViewportMetrics(editor, coords.top, coords.bottom);
};

const getActiveCaretViewportMetrics = (vditor: IVditor, editor: HTMLElement): CaretViewportMetrics | null => {
    const activeElement = document.activeElement;
    if (isInsideCodeMirror(activeElement)) {
        const block = activeElement?.closest("[data-type='code-block']") as HTMLElement | null;
        if (block && editor.contains(block)) {
            return getCodeMirrorCaretViewportMetrics(editor, block);
        }
    }

    const range = getSelectionRangeInEditor(editor);
    if (!range) {
        return null;
    }
    const caretRect = getRangeCaretRect(range);
    if (!caretRect) {
        return null;
    }
    return rectToCaretViewportMetrics(editor, caretRect.top, caretRect.bottom);
};

const getCaretViewportMetricsAfterRestore = (vditor: IVditor, state: CacheFocusState): CaretViewportMetrics | null => {
    const editor = vditor[vditor.currentMode].element;

    if (state.type === "cm" && state.blockIndex != null && state.blockIndex >= 0) {
        const blocks = editor.querySelectorAll("[data-type='code-block']");
        const block = blocks[state.blockIndex] as HTMLElement | undefined;
        if (block) {
            return getCodeMirrorCaretViewportMetrics(editor, block);
        }
        return null;
    }

    const range = getSelectionRangeInEditor(editor);
    if (!range) {
        return null;
    }
    const caretRect = getRangeCaretRect(range);
    if (!caretRect) {
        return null;
    }
    return rectToCaretViewportMetrics(editor, caretRect.top, caretRect.bottom);
};

const attachCaretViewportOffset = (vditor: IVditor, editor: HTMLElement, state: CacheFocusState): CacheFocusState => {
    const metrics = getActiveCaretViewportMetrics(vditor, editor);
    if (metrics?.visible) {
        return { ...state, caretViewportOffset: metrics.offset };
    }
    const next = { ...state };
    delete next.caretViewportOffset;
    return next;
};

const finalizeFocusState = (vditor: IVditor, state: CacheFocusState): CacheFocusState => {
    const editor = vditor[vditor.currentMode].element;
    let next = attachCaretViewportOffset(vditor, editor, state);
    if (isVscodeFocusHost(vditor)) {
        delete next.scrollTop;
    } else {
        next = { ...next, scrollTop: editor.scrollTop };
    }
    return next;
};

const buildFocusStateFromCurrentSelection = (vditor: IVditor): CacheFocusState | null => {
    const editor = vditor[vditor.currentMode].element;
    const activeElement = document.activeElement;

    if (isInsideCodeMirror(activeElement)) {
        const block = activeElement?.closest("[data-type='code-block']") as HTMLElement | null;
        if (block) {
            const blockIndex = getCodeBlockIndex(editor, block);
            const view = getCodeMirrorView(block);
            if (view && blockIndex >= 0) {
                const selection = view.state.selection.main;
                return {
                    mode: vditor.currentMode,
                    type: "cm",
                    start: selection.anchor,
                    end: selection.head,
                    blockIndex,
                };
            }
        }
    }

    const range = getSelectionRangeInEditor(editor);
    if (!range) {
        return null;
    }
    const { start, end } = getEditorTextOffset(editor, range);
    return {
        mode: vditor.currentMode,
        type: "editor",
        start,
        end,
        startOffset: range.startOffset,
        endOffset: range.endOffset,
        startPath: getNodePath(editor, range.startContainer),
        endPath: getNodePath(editor, range.endContainer),
    };
};

export const persistScrollFocusAnchor = (vditor: IVditor) => {
    if (!vditor.options.cache?.id || !accessLocalStorage()) {
        return;
    }

    const editor = vditor[vditor.currentMode].element;
    const metrics = getActiveCaretViewportMetrics(vditor, editor);
    let state = buildFocusStateFromCurrentSelection(vditor) ?? readFocusState(vditor);
    if (!state || state.mode !== vditor.currentMode) {
        return;
    }

    if (metrics?.visible) {
        persistFocusState(vditor, { ...state, caretViewportOffset: metrics.offset });
        return;
    }

    const nextState = { ...state };
    delete nextState.caretViewportOffset;
    persistFocusState(vditor, nextState);
};

const applyCaretViewportOffset = (vditor: IVditor, state: CacheFocusState): boolean => {
    if (state.caretViewportOffset == null || Number.isNaN(state.caretViewportOffset)) {
        return false;
    }
    const metrics = getCaretViewportMetricsAfterRestore(vditor, state);
    if (!metrics) {
        return false;
    }
    const delta = metrics.offset - state.caretViewportOffset;
    if (Math.abs(delta) < 1) {
        return true;
    }
    adjustEditorScrollBy(vditor, delta);
    return true;
};

const restoreDocumentScrollOnLoad = (vditor: IVditor, state: CacheFocusState) => {
    if (isVscodeFocusHost(vditor)) {
        restoreDocumentScroll(vditor);
        return;
    }
    if (state.scrollTop != null && !Number.isNaN(state.scrollTop)) {
        restoreDocumentScroll(vditor, state.scrollTop);
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

const applyFocusState = (vditor: IVditor, state: CacheFocusState) => {
    const editor = vditor[vditor.currentMode].element;

    if (state.type === "cm" && state.blockIndex != null && state.blockIndex >= 0) {
        const blocks = editor.querySelectorAll("[data-type='code-block']");
        const block = blocks[state.blockIndex] as HTMLElement | undefined;
        if (block) {
            restoreCodeMirrorFocus(block, state.start, state.end, vditor);
        }
        return;
    }

    const start = Math.max(0, state.start);
    const caretOnly = state.start === state.end;
    const end = caretOnly ? start : Math.max(start, state.end);
    const restoredByPath = setSelectionByPath(
        editor,
        state.startPath,
        state.startOffset,
        caretOnly ? state.startPath : state.endPath,
        caretOnly ? state.startOffset : state.endOffset,
    );
    if (!restoredByPath) {
        setSelectionByPosition(start, end, editor);
    }
    editor.focus({ preventScroll: true });
};

const finishDocumentLoadScroll = (vditor: IVditor, state: CacheFocusState | null) => {
    if (state && applyCaretViewportOffset(vditor, state)) {
        return;
    }
    if (state) {
        restoreDocumentScrollOnLoad(vditor, state);
        return;
    }
    restoreDocumentScroll(vditor);
};

const scheduleOutlineSyncOnLoad = (vditor: IVditor) => {
    window.requestAnimationFrame(() => {
        syncOutlineOnDocumentLoad(vditor);
    });
};

export const saveCacheFocus = (vditor: IVditor) => {
    const editor = vditor[vditor.currentMode].element;
    const activeElement = document.activeElement;

    if (isInsideCodeMirror(activeElement)) {
        const block = activeElement?.closest("[data-type='code-block']") as HTMLElement | null;
        if (block) {
            const blockIndex = getCodeBlockIndex(editor, block);
            const view = getCodeMirrorView(block);
            if (view && blockIndex >= 0) {
                const selection = view.state.selection.main;
                persistFocusState(vditor, finalizeFocusState(vditor, {
                    mode: vditor.currentMode,
                    type: "cm",
                    start: selection.anchor,
                    end: selection.head,
                    blockIndex,
                }));
                return;
            }
        }
    }

    const range = getEditorRange(vditor);
    const { start, end } = getEditorTextOffset(editor, range);
    persistFocusState(vditor, finalizeFocusState(vditor, {
        mode: vditor.currentMode,
        type: "editor",
        start,
        end,
        startOffset: range.startOffset,
        endOffset: range.endOffset,
        startPath: getNodePath(editor, range.startContainer),
        endPath: getNodePath(editor, range.endContainer),
    }));
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
        if (onLoad) {
            finishDocumentLoadScroll(vditor, null);
            scheduleOutlineSyncOnLoad(vditor);
        }
        return;
    }

    if (onLoad || focusSavedMap.get(vditor) === true) {
        focusSavedMap.set(vditor, true);
    }

    const apply = () => {
        applyFocusState(vditor, state);
        if (!onLoad) {
            return;
        }
        finishDocumentLoadScroll(vditor, state);
        scheduleOutlineSyncOnLoad(vditor);
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
