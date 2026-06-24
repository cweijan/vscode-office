import { getSelectionRangeInEditor, setSelectionFocus } from "./selection";

const HIGHLIGHT_NAME = "vditor-frozen-selection";
const supportsCssHighlight = typeof CSS !== "undefined" && "highlights" in CSS;
let highlightStyleInjected = false;

let overlayEl: HTMLElement | null = null;
let scrollEl: HTMLElement | null = null;
let repositionHandler: (() => void) | null = null;

const getEditor = (vditor: IVditor) => vditor[vditor.currentMode].element;

const ensureHighlightStyle = () => {
    if (highlightStyleInjected || !supportsCssHighlight) {
        return;
    }
    const style = document.createElement("style");
    style.id = "vditor-frozen-selection-style";
    style.textContent = `::highlight(${HIGHLIGHT_NAME}) {
  background-color: var(
    --vscode-editor-selectionBackground,
    color-mix(in srgb, var(--link-color, #4a90d9) 35%, transparent)
  );
  color: var(--vscode-editor-selectionForeground, inherit);
}`;
    document.head.appendChild(style);
    highlightStyleInjected = true;
};

const repositionOverlay = (range: Range) => {
    if (!overlayEl) {
        return;
    }
    overlayEl.replaceChildren();
    const rects = range.getClientRects();
    for (let i = 0; i < rects.length; i++) {
        const rect = rects[i];
        if (rect.width === 0 && rect.height === 0) {
            continue;
        }
        const mark = document.createElement("div");
        mark.className = "vditor-frozen-selection__rect";
        mark.style.top = `${rect.top}px`;
        mark.style.left = `${rect.left}px`;
        mark.style.width = `${rect.width}px`;
        mark.style.height = `${rect.height}px`;
        overlayEl.appendChild(mark);
    }
};

const bindOverlayReposition = (vditor: IVditor, range: Range) => {
    const editor = getEditor(vditor);
    scrollEl = editor;
    repositionHandler = () => repositionOverlay(range);
    repositionHandler();
    editor.addEventListener("scroll", repositionHandler, { passive: true });
    window.addEventListener("resize", repositionHandler, { passive: true });
};

const unbindOverlayReposition = () => {
    if (scrollEl && repositionHandler) {
        scrollEl.removeEventListener("scroll", repositionHandler);
    }
    if (repositionHandler) {
        window.removeEventListener("resize", repositionHandler);
    }
    scrollEl = null;
    repositionHandler = null;
};

/** 在编辑器失焦时保留选区的视觉高亮（类似 Notion） */
export const showFrozenSelection = (vditor: IVditor, range: Range) => {
    hideFrozenSelection(vditor);
    const editor = getEditor(vditor);
    const cloned = range.cloneRange();

    if (supportsCssHighlight) {
        ensureHighlightStyle();
        CSS.highlights.set(HIGHLIGHT_NAME, new Highlight(cloned));
        editor.classList.add("vditor--has-frozen-selection");
        return;
    }

    overlayEl = document.createElement("div");
    overlayEl.className = "vditor-frozen-selection";
    overlayEl.setAttribute("aria-hidden", "true");
    document.body.appendChild(overlayEl);
    bindOverlayReposition(vditor, cloned);
};

export const hideFrozenSelection = (vditor: IVditor) => {
    const editor = getEditor(vditor);
    editor.classList.remove("vditor--has-frozen-selection");

    if (supportsCssHighlight) {
        CSS.highlights.delete(HIGHLIGHT_NAME);
    }

    unbindOverlayReposition();
    overlayEl?.remove();
    overlayEl = null;
};

/** 打开 AI 弹窗时捕获当前选区；若已有非折叠选区则返回克隆 Range */
export const captureEditorSelection = (vditor: IVditor): Range | null => {
    const editor = getEditor(vditor);
    const range = getSelectionRangeInEditor(editor);
    if (!range || range.collapsed) {
        return null;
    }
    const cloned = range.cloneRange();
    vditor[vditor.currentMode].range = cloned;
    return cloned;
};

/** 将冻结/缓存的选区恢复到编辑器，供替换选中文本时使用 */
export const restoreEditorSelection = (vditor: IVditor, range?: Range | null) => {
    const editor = getEditor(vditor);
    const target = range ?? vditor[vditor.currentMode].range;
    if (!target || target.collapsed) {
        editor.focus({ preventScroll: true });
        return;
    }
    try {
        if (!editor.contains(target.startContainer) || !editor.contains(target.endContainer)) {
            editor.focus({ preventScroll: true });
            return;
        }
        setSelectionFocus(target.cloneRange());
        editor.focus({ preventScroll: true });
    } catch {
        editor.focus({ preventScroll: true });
    }
};
