import { indentLess, redo, redoDepth, undo, undoDepth } from "@codemirror/commands";
import { LanguageSupport } from "@codemirror/language";
import { Compartment, EditorSelection, Prec } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";

import { expandMarker } from "../ir/expandMarker";
import { processAfterRender, recordHistory as recordIrHistory } from "../ir/process";
import { Constants } from "../constants";
import { recordHistory as recordWysiwygHistory } from "../wysiwyg/afterRenderEvent";
import { getEditorRange, preserveEditorScroll, setRangeByWbr, setSelectionFocus } from "../util/selection";
import { afterRenderEvent } from "../wysiwyg/afterRenderEvent";
import {
    ensureCodeBlockChrome,
    removeCodeBlockChrome,
    updateCodeBlockChromeLanguage,
} from "./codeBlockChrome";
import { loadCodeMirrorHighlightLanguage } from "./codeBlockHighlightLanguages";
import { stopHandledCodeMirrorKeymap, vditorCodeMirrorSetup } from "./codeMirrorSetup";
import { mathRender } from "../markdown/mathRender";
import { mermaidRender } from "../markdown/mermaidRender";
import { plantumlRender } from "../markdown/plantumlRender";

export { focusCodeBlockChromeLanguage, isInsideCodeBlockChrome } from "./codeBlockChrome";
export {
    focusCodeBlockLanguageInput,
    focusIrCodeBlockLanguageMarker,
    showCodeBlockLanguagePopover,
} from "./codeBlockLanguagePopover";

const CM_HOST_CLASS = "vditor-cm-host";
export const CM_BLOCK_CLASS = "vditor-code-block--cm";
export const CM_EDITING_CLASS = "vditor-cm-block--editing";
export const CM_SPLIT_CLASS = "vditor-cm-block--split";
const CM_BLOCK_DATA_TYPES = new Set(["code-block", "math-block"]);
const SPECIAL_LANGUAGES = ["mermaid", "plantuml", "math"];

interface CodeMirrorBinding {
    view: EditorView;
    languageCompartment: Compartment;
    editPre: HTMLElement;
    syncCode: HTMLElement;
    updating: boolean;
    syncTimer: number;
    previewTimer: number;
    languageName: string;
}

const bindings = new WeakMap<HTMLElement, CodeMirrorBinding>();

export const isSpecialCodeLanguage = (codeElement: HTMLElement) => {
    for (const lang of SPECIAL_LANGUAGES) {
        if (codeElement.classList.contains(`language-${lang}`)) {
            return true;
        }
    }
    return false;
};

/** PlantUML 预览渲染为 code 内的 img，不应触发普通图片编辑弹窗 */
export const isPlantumlRenderImage = (target: EventTarget | null) => {
    return target instanceof HTMLElement
        && target.tagName === "IMG"
        && !!target.closest(".language-plantuml");
};

export const isSpecialBlock = (blockElement: HTMLElement | null) => {
    if (!blockElement) {
        return false;
    }
    if (blockElement.getAttribute("data-type") === "math-block") {
        return true;
    }
    const parts = getBlockParts(blockElement);
    return !!parts && isSpecialCodeLanguage(parts.code);
};

export const isSpecialPreviewBlock = (blockElement: HTMLElement | null) => {
    return isSpecialBlock(blockElement) && !blockElement?.classList.contains(CM_EDITING_CLASS);
};

export const isMathBlockElement = (blockElement: HTMLElement | null) => {
    return blockElement?.getAttribute("data-type") === "math-block";
};

/** 数学块预览态：隐藏源码 pre，仅展示渲染结果（源码仅供 Lute / CodeMirror 同步） */
export const ensureMathBlockPreviewMode = (blockElement: HTMLElement) => {
    if (!isMathBlockElement(blockElement) || blockElement.classList.contains(CM_EDITING_CLASS)) {
        return;
    }
    const parts = getBlockParts(blockElement);
    if (!parts) {
        return;
    }
    parts.editPre.style.display = "none";
    parts.editPre.setAttribute("contenteditable", "false");
    parts.code.classList.add("language-math");
    parts.code.setAttribute("contenteditable", "false");
    if (parts.preview) {
        parts.preview.style.display = "";
    }
};

export const syncMathBlocksPreviewMode = (root: ParentNode) => {
    for (const block of root.querySelectorAll("[data-type='math-block']")) {
        ensureMathBlockPreviewMode(block as HTMLElement);
    }
};

export const isCmCodeBlock = (blockElement: HTMLElement | null) => {
    if (!blockElement) {
        return false;
    }
    const dataType = blockElement.getAttribute("data-type");
    if (!dataType || !CM_BLOCK_DATA_TYPES.has(dataType)) {
        return false;
    }
    if (!getBlockParts(blockElement)) {
        return false;
    }
    if (isSpecialBlock(blockElement)) {
        return blockElement.classList.contains(CM_EDITING_CLASS);
    }
    return true;
};

/** @deprecated use isCmCodeBlock */
export const isWysiwygCmCodeBlock = isCmCodeBlock;

export const isInsideCodeMirror = (target: EventTarget | Node | null) => {
    if (!target) {
        return !!document.activeElement?.closest(`.${CM_BLOCK_CLASS} .cm-editor`);
    }
    const node = target instanceof Element ? target : (target as Node).parentElement;
    return !!node?.closest(`.${CM_BLOCK_CLASS} .cm-editor`);
};

/** @deprecated use isInsideCodeMirror */
export const isInsideWysiwygCodeMirror = isInsideCodeMirror;

export const getCodeLanguageName = (codeElement: HTMLElement) => {
    const match = codeElement.className.match(/language-([^\s]+)/);
    return match ? match[1] : "";
};

/** @deprecated use getCodeLanguageName */
const getLanguageName = getCodeLanguageName;

export const shouldShowLanguagePopover = (blockElement: HTMLElement | null) => {
    if (!blockElement || blockElement.getAttribute("data-type") !== "code-block") {
        return false;
    }
    return hasCodeMirror(blockElement) || isCmCodeBlock(blockElement);
};

export const resolveCmCodeBlock = (vditor: IVditor, blockElement?: HTMLElement | null) => {
    if (blockElement?.isConnected && shouldShowLanguagePopover(blockElement)) {
        return blockElement;
    }
    const fromActive = document.activeElement?.closest("[data-type='code-block']") as HTMLElement;
    if (fromActive?.isConnected && shouldShowLanguagePopover(fromActive)) {
        return fromActive;
    }
    const editor = getModeEditor(vditor);
    if (editor) {
        const focusedCm = editor.querySelector(`.${CM_BLOCK_CLASS} .cm-editor.cm-focused`);
        const fromCm = focusedCm?.closest("[data-type='code-block']") as HTMLElement;
        if (fromCm?.isConnected && shouldShowLanguagePopover(fromCm)) {
            return fromCm;
        }
    }
    return blockElement?.isConnected ? blockElement : null;
};

const getBlockParts = (blockElement: HTMLElement) => {
    const editPre = blockElement.querySelector(
        "pre.vditor-wysiwyg__pre, pre.vditor-ir__marker--pre, pre:first-child",
    ) as HTMLElement;
    if (!editPre) {
        return null;
    }
    const code = editPre.querySelector("code");
    if (!code) {
        return null;
    }
    const preview = blockElement.querySelector(
        ".vditor-wysiwyg__preview, .vditor-ir__preview",
    ) as HTMLElement;
    return { editPre, code, preview };
};

const getModeEditor = (vditor: IVditor) => {
    if (vditor.currentMode === "wysiwyg") {
        return vditor.wysiwyg.element;
    }
    if (vditor.currentMode === "ir") {
        return vditor.ir.element;
    }
    return null;
};

const getCmBlockSelector = (mode: string) => {
    if (mode === "wysiwyg") {
        return ".vditor-wysiwyg__block[data-type='code-block'], .vditor-wysiwyg__block[data-type='math-block']";
    }
    return "[data-type='code-block'], [data-type='math-block']";
};

/** @deprecated use getCmBlockSelector */
const getCodeBlockSelector = getCmBlockSelector;

/** 普通代码块只保留隐藏的 sync code + CodeMirror；特殊块编辑时保留 preview 并上下分层显示 */
export const prepareCmBlockDom = (blockElement: HTMLElement, keepPreview = false) => {
    if (!isCmCodeBlock(blockElement) && !blockElement.classList.contains(CM_EDITING_CLASS)) {
        return;
    }
    const parts = getBlockParts(blockElement);
    if (!parts) {
        return;
    }
    const { editPre, code, preview } = parts;
    blockElement.classList.add(CM_BLOCK_CLASS);
    if (blockElement.classList.contains("vditor-ir__node")) {
        blockElement.classList.add("vditor-ir__node--expand");
    }
    editPre.classList.add(CM_HOST_CLASS);
    editPre.setAttribute("contenteditable", "false");
    editPre.style.display = "block";
    code.setAttribute("contenteditable", "false");
    code.setAttribute("hidden", "");
    code.setAttribute("aria-hidden", "true");
    code.style.display = "none";
    if (preview) {
        if (keepPreview) {
            preview.style.display = "";
        } else {
            preview.remove();
        }
    }
};

/** @deprecated use prepareCmBlockDom */
export const prepareWysiwygCmBlockDom = prepareCmBlockDom;

const loadLanguage = (languageName: string): Promise<LanguageSupport | undefined> => {
    return loadCodeMirrorHighlightLanguage(languageName);
};

const getSpecialPreviewLanguage = (blockElement: HTMLElement, preview: HTMLElement) => {
    const parts = getBlockParts(blockElement);
    if (parts) {
        const lang = getCodeLanguageName(parts.code);
        if (lang) {
            return lang;
        }
    }
    if (blockElement.getAttribute("data-type") === "math-block") {
        return "math";
    }
    const codeEl = preview.querySelector("code") as HTMLElement | null;
    const divEl = preview.querySelector("div.language-math, div[data-type='math-block']") as HTMLElement | null;
    return divEl ? "math" : (codeEl ? getCodeLanguageName(codeEl) : "");
};

const resetPreviewRenderElement = (
    preview: HTMLElement,
    source: string,
    language: string,
    blockElement: HTMLElement,
) => {
    if (isMathBlockElement(blockElement)) {
        let mathEl = preview.querySelector(
            "div[data-type='math-block'], div.language-math",
        ) as HTMLElement | null;
        if (!mathEl) {
            preview.querySelector("code")?.remove();
            mathEl = document.createElement("div");
            mathEl.setAttribute("data-type", "math-block");
            preview.replaceChildren(mathEl);
        }
        mathEl.className = "language-math";
        mathEl.removeAttribute("data-math");
        mathEl.classList.remove("vditor-reset--error");
        mathEl.textContent = source;
        return mathEl;
    }
    let codeEl = preview.querySelector(
        language === "plantuml" || language === "mermaid"
            ? `div.language-${language}, code.language-${language}`
            : "code",
    ) as HTMLElement | null;
    if (!codeEl) {
        codeEl = document.createElement(
            language === "plantuml" || language === "mermaid" ? "div" : "code",
        );
        preview.replaceChildren(codeEl);
    }
    codeEl.className = `language-${language}`;
    if (language === "mermaid") {
        codeEl.removeAttribute("data-vditor-mermaid-processed");
        codeEl.removeAttribute("data-mermaid");
        codeEl.removeAttribute("id");
        codeEl.classList.remove("vditor-reset--error");
    } else if (language === "math") {
        codeEl.removeAttribute("data-math");
        codeEl.classList.remove("vditor-reset--error");
    } else if (language === "plantuml") {
        codeEl.classList.remove("vditor-reset--error");
    }
    codeEl.textContent = source;
    return codeEl;
};

const ensureSpecialSplitLayout = (blockElement: HTMLElement) => {
    const parts = getBlockParts(blockElement);
    if (!parts?.preview) {
        return;
    }
    blockElement.classList.add(CM_SPLIT_CLASS);
    // CodeMirror 在上、渲染预览在下（默认 DOM：editPre 在 preview 前）
    if (parts.preview.compareDocumentPosition(parts.editPre) & Node.DOCUMENT_POSITION_PRECEDING) {
        blockElement.insertBefore(parts.editPre, parts.preview);
    }
    parts.preview.style.display = "";
    parts.preview.style.pointerEvents = "none";
    parts.editPre.style.display = "block";
};

const rerenderSpecialPreview = (preview: HTMLElement, vditor: IVditor, source?: string) => {
    const blockElement = preview.closest("[data-type='code-block'], [data-type='math-block']") as HTMLElement;
    if (!blockElement) {
        return;
    }
    const language = getSpecialPreviewLanguage(blockElement, preview);
    if (!language) {
        return;
    }
    const parts = getBlockParts(blockElement);
    const codeText = source ?? parts?.code.textContent ?? "";
    resetPreviewRenderElement(preview, codeText, language, blockElement);
    if (language === "mermaid") {
        mermaidRender(preview, vditor.options.cdn, vditor);
    } else if (language === "plantuml") {
        plantumlRender(preview, vditor.options.cdn);
    } else if (language === "math") {
        mathRender(preview, { cdn: vditor.options.cdn, math: vditor.options.preview.math });
    }
    preview.setAttribute("data-render", "1");
};

const scheduleSpecialPreviewRerender = (
    blockElement: HTMLElement,
    binding: CodeMirrorBinding,
    vditor: IVditor,
) => {
    window.clearTimeout(binding.previewTimer);
    binding.previewTimer = window.setTimeout(() => {
        const parts = getBlockParts(blockElement);
        if (!parts?.preview) {
            return;
        }
        rerenderSpecialPreview(parts.preview, vditor, binding.view.state.doc.toString());
    }, 200);
};

const exitSpecialBlockEdit = (vditor: IVditor, blockElement: HTMLElement) => {
    if (!blockElement.classList.contains(CM_EDITING_CLASS)) {
        return;
    }
    const binding = bindings.get(blockElement);
    const finalText = binding?.view.state.doc.toString();
    if (binding) {
        window.clearTimeout(binding.syncTimer);
        window.clearTimeout(binding.previewTimer);
        binding.syncCode.textContent = finalText ?? binding.syncCode.textContent;
        binding.view.destroy();
        bindings.delete(blockElement);
        binding.editPre.querySelector(".cm-editor")?.remove();
        removeCodeBlockChrome(blockElement);
    }
    blockElement.classList.remove(CM_BLOCK_CLASS, CM_EDITING_CLASS, CM_SPLIT_CLASS);
    const parts = getBlockParts(blockElement);
    if (!parts) {
        return;
    }
    parts.editPre.classList.remove(CM_HOST_CLASS);
    parts.editPre.style.display = "none";
    parts.code.removeAttribute("hidden");
    parts.code.removeAttribute("aria-hidden");
    parts.code.style.display = "";
    if (parts.preview) {
        parts.preview.style.display = "";
        parts.preview.style.pointerEvents = "";
        rerenderSpecialPreview(parts.preview, vditor, finalText);
    }
    if (isMathBlockElement(blockElement)) {
        ensureMathBlockPreviewMode(blockElement);
    }
    if (vditor.currentMode === "wysiwyg") {
        clearTimeout(vditor.wysiwyg.afterRenderTimeoutId);
        recordWysiwygHistory(vditor, {
            enableAddUndoStack: true,
            enableHint: false,
            enableInput: true,
        });
        afterRenderEvent(vditor, {
            enableAddUndoStack: false,
            enableHint: false,
            enableInput: true,
        });
    } else if (vditor.currentMode === "ir") {
        clearTimeout(vditor.ir.processTimeoutId);
        recordIrHistory(vditor, {
            enableAddUndoStack: true,
            enableHint: false,
            enableInput: true,
        });
        processAfterRender(vditor, {
            enableAddUndoStack: false,
            enableHint: false,
            enableInput: true,
        });
    }
};

/** 数学公式 / Mermaid / PlantUML：CodeMirror 在上、预览在下，编辑时实时重绘 */
export const enterSpecialBlockEdit = (vditor: IVditor, blockElement: HTMLElement) => {
    if (!isSpecialBlock(blockElement) || blockElement.classList.contains(CM_EDITING_CLASS)) {
        return false;
    }
    blockElement.classList.add(CM_EDITING_CLASS);
    ensureSpecialSplitLayout(blockElement);
    mountCodeMirror(blockElement, vditor, true);
    const binding = bindings.get(blockElement);
    const parts = getBlockParts(blockElement);
    if (binding && parts?.preview) {
        rerenderSpecialPreview(parts.preview, vditor, binding.view.state.doc.toString());
    }
    focusCodeMirror(blockElement, true, vditor);
    return true;
};

const syncRenderOptions = {
    enableAddUndoStack: false,
    enableHint: false,
    enableInput: true,
};

const scheduleSync = (binding: CodeMirrorBinding, vditor: IVditor) => {
    window.clearTimeout(binding.syncTimer);
    binding.syncTimer = window.setTimeout(() => {
        if (vditor.currentMode === "wysiwyg") {
            afterRenderEvent(vditor, syncRenderOptions);
        } else if (vditor.currentMode === "ir") {
            processAfterRender(vditor, syncRenderOptions);
        }
    }, vditor.options.undoDelay);
};

/** 离开 CodeMirror 时将代码块变更合并入 Vditor 外部撤销栈 */
export const flushCodeMirrorExternalUndo = (vditor: IVditor) => {
    if (isInsideCodeMirror(document.activeElement)) {
        return;
    }
    const editor = getModeEditor(vditor);
    if (!editor) {
        return;
    }
    for (const block of editor.querySelectorAll(`.${CM_BLOCK_CLASS}`)) {
        const binding = bindings.get(block as HTMLElement);
        if (!binding) {
            continue;
        }
        window.clearTimeout(binding.syncTimer);
        window.clearTimeout(binding.previewTimer);
        binding.syncCode.textContent = binding.view.state.doc.toString();
    }
    const recordOptions = {
        enableAddUndoStack: true,
        enableHint: false,
        enableInput: true,
    };
    if (vditor.currentMode === "wysiwyg") {
        clearTimeout(vditor.wysiwyg.afterRenderTimeoutId);
        recordWysiwygHistory(vditor, recordOptions);
    } else if (vditor.currentMode === "ir") {
        clearTimeout(vditor.ir.processTimeoutId);
        recordIrHistory(vditor, recordOptions);
    }
};

export const getActiveCodeMirrorView = (): EditorView | undefined => {
    const cmEditor = document.activeElement?.closest(".cm-editor");
    if (!cmEditor) {
        return undefined;
    }
    const blockElement = cmEditor.closest("[data-type='code-block'], [data-type='math-block']") as HTMLElement | null;
    if (!blockElement) {
        return undefined;
    }
    return bindings.get(blockElement)?.view;
};

export const canUndoActiveCodeMirror = () => {
    const view = getActiveCodeMirrorView();
    return !!view && undoDepth(view.state) > 0;
};

export const canRedoActiveCodeMirror = () => {
    const view = getActiveCodeMirrorView();
    return !!view && redoDepth(view.state) > 0;
};

export const undoActiveCodeMirror = () => {
    const view = getActiveCodeMirrorView();
    if (!view || undoDepth(view.state) === 0) {
        return false;
    }
    return undo(view);
};

export const redoActiveCodeMirror = () => {
    const view = getActiveCodeMirrorView();
    if (!view || redoDepth(view.state) === 0) {
        return false;
    }
    return redo(view);
};

const syncCodeFromView = (binding: CodeMirrorBinding, vditor: IVditor, blockElement: HTMLElement) => {
    binding.syncCode.textContent = binding.view.state.doc.toString();
    if (isSpecialBlock(blockElement) && blockElement.classList.contains(CM_EDITING_CLASS)) {
        scheduleSpecialPreviewRerender(blockElement, binding, vditor);
        return;
    }
    scheduleSync(binding, vditor);
};

const syncViewFromCode = (binding: CodeMirrorBinding) => {
    const codeText = binding.syncCode.textContent || "";
    const cmText = binding.view.state.doc.length ? binding.view.state.doc.toString() : "";
    if (codeText === cmText) {
        return;
    }
    binding.updating = true;
    binding.view.dispatch({
        changes: { from: 0, to: binding.view.state.doc.length, insert: codeText },
    });
    binding.updating = false;
};

const insertLiteralTab = (view: EditorView) => {
    view.dispatch(view.state.update(view.state.replaceSelection("\t"), {
        scrollIntoView: true,
        userEvent: "input",
    }));
    return true;
};

const applyLanguage = (blockElement: HTMLElement, binding: CodeMirrorBinding, languageName: string) => {
    if (binding.languageName === languageName) {
        return;
    }
    if (!languageName) {
        binding.view.dispatch({
            effects: binding.languageCompartment.reconfigure([]),
        });
        binding.languageName = "";
        return;
    }
    loadLanguage(languageName).then((lang) => {
        if (!lang || !bindings.has(blockElement)) {
            return;
        }
        binding.view.dispatch({
            effects: binding.languageCompartment.reconfigure(lang),
        });
        binding.languageName = languageName;
    });
};

const getCmSelectionText = (view: EditorView) => {
    const parts: string[] = [];
    for (const range of view.state.selection.ranges) {
        parts.push(view.state.sliceDoc(range.from, range.to));
    }
    return parts.join("\n");
};

/** 无选区时按整行剪切（含行尾换行，末行除外） */
const getCmCutRange = (view: EditorView) => {
    const { from, to } = view.state.selection.main;
    if (from !== to) {
        return { from, to, text: getCmSelectionText(view) };
    }
    const line = view.state.doc.lineAt(from);
    const cutFrom = line.from;
    const cutTo = line.number < view.state.doc.lines ? line.to + 1 : line.to;
    return { from: cutFrom, to: cutTo, text: view.state.sliceDoc(cutFrom, cutTo) };
};

const clearCmSelection = (view: EditorView) => {
    const { from, to, head } = view.state.selection.main;
    if (from === to) {
        return;
    }
    view.dispatch({
        selection: EditorSelection.cursor(head),
    });
};

const focusEditorWithoutScroll = (editor: HTMLElement) => {
    editor.focus({ preventScroll: true });
};

const focusCmViewWithoutScroll = (view: EditorView) => {
    view.contentDOM.focus({ preventScroll: true });
};

const cmDomEventHandlers = (vditor: IVditor, blockElement: HTMLElement, binding: CodeMirrorBinding) => ({
    mousedown: (event: Event) => {
        event.stopPropagation();
    },
    focus: () => false,
    blur: () => {
        window.setTimeout(() => {
            if (!bindings.has(blockElement) || binding.view.hasFocus) {
                return;
            }
            if (blockElement.contains(document.activeElement)) {
                return;
            }
            clearCmSelection(binding.view);
            if (isSpecialBlock(blockElement) && blockElement.classList.contains(CM_EDITING_CLASS)) {
                exitSpecialBlockEdit(vditor, blockElement);
            } else {
                flushCodeMirrorExternalUndo(vditor);
            }
            vditor.undo.resetIcon(vditor);
        }, 0);
        return false;
    },
    click: (event: Event) => {
        event.stopPropagation();
    },
    copy: (event: Event) => {
        const clipboardEvent = event as ClipboardEvent;
        const view = binding.view;
        if (!view?.state || !clipboardEvent.clipboardData) {
            return false;
        }
        const text = getCmSelectionText(view);
        if (!text) {
            return false;
        }
        event.stopPropagation();
        clipboardEvent.preventDefault();
        clipboardEvent.clipboardData.setData("text/plain", text);
        return true;
    },
    cut: (event: Event) => {
        const clipboardEvent = event as ClipboardEvent;
        const view = binding.view;
        if (!view?.state || !clipboardEvent.clipboardData) {
            return false;
        }
        const { from, to, text } = getCmCutRange(view);
        if (from === to) {
            return false;
        }
        event.stopPropagation();
        clipboardEvent.preventDefault();
        clipboardEvent.clipboardData.setData("text/plain", text);
        view.dispatch({
            changes: { from, to, insert: "" },
            selection: EditorSelection.cursor(from),
        });
        syncCodeFromView(binding, vditor, blockElement);
        return true;
    },
    paste: (event: Event) => {
        const clipboardEvent = event as ClipboardEvent;
        const view = binding.view;
        if (!view?.state || !clipboardEvent.clipboardData) {
            return false;
        }
        const text = clipboardEvent.clipboardData.getData("text/plain");
        event.stopPropagation();
        clipboardEvent.preventDefault();
        if (text) {
            view.dispatch(view.state.replaceSelection(text));
            syncCodeFromView(binding, vditor, blockElement);
        }
        return true;
    },
    keydown: (event: Event) => {
        if ((event as KeyboardEvent).defaultPrevented) {
            event.stopPropagation();
        }
    },
    input: (event: Event) => {
        event.stopPropagation();
    },
});

const focusAdjacentEditorBlock = (
    vditor: IVditor,
    blockElement: HTMLElement,
    direction: "up" | "down",
) => {
    const editor = getModeEditor(vditor);
    if (!editor) {
        return;
    }

    const focusBlockPosition = (element: HTMLElement, toStart: boolean) => {
        focusEditorWithoutScroll(editor);
        const range = getEditorRange(vditor);
        range.selectNodeContents(element);
        range.collapse(toStart);
        setSelectionFocus(range);
        if (vditor.currentMode === "ir") {
            expandMarker(range, vditor);
        }
    };

    const insertAdjacentEmptyBlock = (position: "before" | "after") => {
        const html = `<p data-block="0">${Constants.ZWSP}<wbr></p>`;
        if (position === "before") {
            blockElement.insertAdjacentHTML("beforebegin", html);
        } else {
            blockElement.insertAdjacentHTML("afterend", html);
        }
        focusEditorWithoutScroll(editor);
        const range = getEditorRange(vditor);
        setRangeByWbr(editor, range);
        setSelectionFocus(range);
    };

    if (direction === "up") {
        const previousElement = blockElement.previousElementSibling as HTMLElement | null;
        if (isCmCodeBlock(previousElement)) {
            focusCodeMirror(previousElement, false, vditor);
        } else if (!previousElement ||
            previousElement.tagName === "TABLE" ||
            previousElement.getAttribute("data-type")) {
            insertAdjacentEmptyBlock("before");
        } else {
            focusBlockPosition(previousElement, false);
        }
        return;
    }

    const nextElement = blockElement.nextElementSibling as HTMLElement | null;
    if (isCmCodeBlock(nextElement)) {
        focusCodeMirror(nextElement, true, vditor);
    } else if (!nextElement ||
        nextElement.tagName === "TABLE" ||
        nextElement.getAttribute("data-type")) {
        insertAdjacentEmptyBlock("after");
    } else {
        focusBlockPosition(nextElement, true);
    }
};

const exitCodeMirrorToAdjacentBlock = (
    view: EditorView,
    vditor: IVditor,
    blockElement: HTMLElement,
    direction: "up" | "down",
) => {
    view.contentDOM.blur();
    focusAdjacentEditorBlock(vditor, blockElement, direction);
};

const buildCodeMirrorNavigationKeymap = (vditor: IVditor, blockElement: HTMLElement) =>
    Prec.high(keymap.of([
        {
            key: "ArrowUp",
            run: (view) => {
                const line = view.state.doc.lineAt(view.state.selection.main.head);
                if (line.number > 1) {
                    return false;
                }
                exitCodeMirrorToAdjacentBlock(view, vditor, blockElement, "up");
                return true;
            },
        },
        {
            key: "ArrowDown",
            run: (view) => {
                const line = view.state.doc.lineAt(view.state.selection.main.head);
                if (line.number < view.state.doc.lines) {
                    return false;
                }
                exitCodeMirrorToAdjacentBlock(view, vditor, blockElement, "down");
                return true;
            },
        },
        {
            key: "Ctrl-Enter",
            mac: "Cmd-Enter",
            run: (view) => {
                const line = view.state.doc.lineAt(view.state.selection.main.head);
                if (line.number < view.state.doc.lines) {
                    return false;
                }
                const editor = getModeEditor(vditor);
                if (!editor) {
                    return false;
                }
                view.contentDOM.blur();
                const html = `<p data-block="0">${Constants.ZWSP}<wbr></p>`;
                blockElement.insertAdjacentHTML("afterend", html);
                focusEditorWithoutScroll(editor);
                const range = getEditorRange(vditor);
                setRangeByWbr(editor, range);
                setSelectionFocus(range);
                return true;
            },
        },
    ]));

const destroyCodeMirror = (blockElement: HTMLElement) => {
    const binding = bindings.get(blockElement);
    if (!binding) {
        return;
    }
    window.clearTimeout(binding.syncTimer);
    window.clearTimeout(binding.previewTimer);
    binding.syncCode.textContent = binding.view.state.doc.toString();
    binding.view.destroy();
    bindings.delete(blockElement);
    binding.editPre.querySelector(".cm-editor")?.remove();
    removeCodeBlockChrome(blockElement);
    const wasSpecialEdit = blockElement.classList.contains(CM_EDITING_CLASS);
    blockElement.classList.remove(CM_BLOCK_CLASS, CM_EDITING_CLASS, CM_SPLIT_CLASS);
    if (!wasSpecialEdit) {
        prepareCmBlockDom(blockElement);
    }
};

export const removeCmCodeBlock = (vditor: IVditor, blockElement: HTMLElement) => {
    if (!isCmCodeBlock(blockElement)) {
        return;
    }

    const editor = getModeEditor(vditor);
    if (!editor) {
        blockElement.remove();
        return;
    }

    const previousElement = blockElement.previousElementSibling as HTMLElement | null;
    const nextElement = blockElement.nextElementSibling as HTMLElement | null;

    const binding = bindings.get(blockElement);
    if (binding) {
        window.clearTimeout(binding.syncTimer);
        window.clearTimeout(binding.previewTimer);
        binding.syncCode.textContent = binding.view.state.doc.toString();
        binding.view.destroy();
        bindings.delete(blockElement);
        binding.editPre.querySelector(".cm-editor")?.remove();
    }
    removeCodeBlockChrome(blockElement);
    blockElement.remove();

    focusEditorWithoutScroll(editor);
    const range = getEditorRange(vditor);

    if (previousElement) {
        if (isCmCodeBlock(previousElement)) {
            focusCodeMirror(previousElement, false, vditor);
        } else {
            range.selectNodeContents(previousElement);
            range.collapse(false);
            setSelectionFocus(range);
            if (vditor.currentMode === "ir") {
                expandMarker(range, vditor);
            }
        }
    } else if (nextElement) {
        if (isCmCodeBlock(nextElement)) {
            focusCodeMirror(nextElement, true, vditor);
        } else {
            range.selectNodeContents(nextElement);
            range.collapse(true);
            setSelectionFocus(range);
            if (vditor.currentMode === "ir") {
                expandMarker(range, vditor);
            }
        }
    } else {
        editor.insertAdjacentHTML("beforeend", `<p data-block="0">${Constants.ZWSP}<wbr></p>`);
        setRangeByWbr(editor, range);
        setSelectionFocus(range);
    }

    if (vditor.currentMode === "wysiwyg") {
        clearTimeout(vditor.wysiwyg.afterRenderTimeoutId);
        vditor.undo.addToUndoStack(vditor);
        afterRenderEvent(vditor, {
            enableAddUndoStack: false,
            enableHint: false,
            enableInput: true,
        });
    } else if (vditor.currentMode === "ir") {
        clearTimeout(vditor.ir.processTimeoutId);
        vditor.undo.addToUndoStack(vditor);
        processAfterRender(vditor, {
            enableAddUndoStack: false,
            enableHint: false,
            enableInput: true,
        });
    }
};

export const destroyAllCodeMirrors = (vditor: IVditor) => {
    const editor = getModeEditor(vditor);
    if (!editor) {
        return;
    }
    editor.querySelectorAll(`.${CM_BLOCK_CLASS}`).forEach((block) => {
        destroyCodeMirror(block as HTMLElement);
    });
};

/** @deprecated use destroyAllCodeMirrors */
export const destroyAllWysiwygCodeMirrors = destroyAllCodeMirrors;

/** Spin DOM 前卸载 CodeMirror，保持 sync code 隐藏 */
export const deactivateAllCodeMirrors = (vditor: IVditor) => {
    const editor = getModeEditor(vditor);
    if (!editor) {
        return;
    }
    editor.querySelectorAll(getCodeBlockSelector(vditor.currentMode)).forEach((block) => {
        const blockElement = block as HTMLElement;
        if (bindings.has(blockElement)) {
            destroyCodeMirror(blockElement);
        } else {
            prepareCmBlockDom(blockElement);
        }
    });
};

/** @deprecated use deactivateAllCodeMirrors */
export const deactivateAllWysiwygCodeMirrors = deactivateAllCodeMirrors;

const collectCodeBlocksInScope = (vditor: IVditor, scope: HTMLElement) => {
    const editor = getModeEditor(vditor);
    if (!editor) {
        return [] as HTMLElement[];
    }
    if (scope === editor) {
        return Array.from(editor.querySelectorAll(getCodeBlockSelector(vditor.currentMode))) as HTMLElement[];
    }
    const selector = getCodeBlockSelector(vditor.currentMode);
    const blocks: HTMLElement[] = [];
    if (scope.matches(selector)) {
        blocks.push(scope);
    }
    scope.querySelectorAll(selector).forEach((block) => {
        blocks.push(block as HTMLElement);
    });
    return blocks;
};

/** Spin 前仅卸载作用域内的 CodeMirror */
export const deactivateCodeMirrorsInScope = (vditor: IVditor, scope: HTMLElement) => {
    for (const blockElement of collectCodeBlocksInScope(vditor, scope)) {
        if (bindings.has(blockElement)) {
            destroyCodeMirror(blockElement);
        } else {
            prepareCmBlockDom(blockElement);
        }
    }
};

/** Spin 后仅重建作用域内的 CodeMirror */
export const renderCodeBlocksInScope = (vditor: IVditor, scope: HTMLElement) => {
    for (const blockElement of collectCodeBlocksInScope(vditor, scope)) {
        mountCodeMirror(blockElement, vditor);
    }
};

/** undo/redo 等整页 DOM 替换后，清理残留 CM 挂载并重新初始化 */
export const remountCodeMirrorsAfterDomReplace = (vditor: IVditor) => {
    if (vditor.currentMode !== "wysiwyg" && vditor.currentMode !== "ir") {
        return;
    }
    renderCodeBlocks(vditor);
};

const cleanupStaleCmArtifacts = (blockElement: HTMLElement) => {
    if (bindings.has(blockElement)) {
        return;
    }
    removeCodeBlockChrome(blockElement);
    blockElement.querySelectorAll(".vditor-cm-chrome").forEach((chrome) => {
        chrome.remove();
    });
    blockElement.querySelectorAll(".cm-editor").forEach((editor) => {
        editor.remove();
    });
};

const mountCodeMirror = (blockElement: HTMLElement, vditor: IVditor, force = false) => {
    if (!force && !isCmCodeBlock(blockElement)) {
        return;
    }

    cleanupStaleCmArtifacts(blockElement);
    prepareCmBlockDom(blockElement, isSpecialBlock(blockElement));

    const parts = getBlockParts(blockElement);
    if (!parts) {
        return;
    }
    if (isMathBlockElement(blockElement)) {
        parts.code.classList.add("language-math");
    }

    const existing = bindings.get(blockElement);
    if (existing) {
        syncViewFromCode(existing);
        const languageName = getLanguageName(parts.code);
        if (existing.languageName !== languageName) {
            existing.syncCode.className = parts.code.className;
            applyLanguage(blockElement, existing, languageName);
        }
        ensureCodeBlockChrome(vditor, blockElement, {
            getCodeText: () => existing.view.state.doc.toString(),
        });
        updateCodeBlockChromeLanguage(blockElement, languageName);
        return;
    }

    const { editPre, code } = parts;
    const languageCompartment = new Compartment();
    const languageName = getLanguageName(code);

    const binding: CodeMirrorBinding = {
        view: null as unknown as EditorView,
        languageCompartment,
        editPre,
        syncCode: code,
        updating: false,
        syncTimer: 0,
        previewTimer: 0,
        languageName: "",
    };

    const rawCode = code.textContent || "";

    const view = new EditorView({
        // Lute有bug, 会给代码块末尾生成一行空行
        doc: rawCode.trimEnd(),
        parent: editPre,
        extensions: [
            vditorCodeMirrorSetup,
            keymap.of(stopHandledCodeMirrorKeymap([{ key: "Tab", run: insertLiteralTab, shift: indentLess }])),
            buildCodeMirrorNavigationKeymap(vditor, blockElement),
            languageCompartment.of([]),
            EditorView.updateListener.of((update) => {
                if (binding.updating || !update.docChanged) {
                    return;
                }
                syncCodeFromView(binding, vditor, blockElement);
                vditor.undo.resetIcon(vditor);
            }),
            EditorView.domEventHandlers(cmDomEventHandlers(vditor, blockElement, binding)),
        ],
    });

    binding.view = view;
    bindings.set(blockElement, binding);
    applyLanguage(blockElement, binding, languageName);
    ensureCodeBlockChrome(vditor, blockElement, {
        getCodeText: () => binding.view.state.doc.toString(),
    });
};

export const renderCodeBlocks = (vditor: IVditor) => {
    const editor = getModeEditor(vditor);
    if (!editor) {
        return;
    }
    editor.querySelectorAll(getCodeBlockSelector(vditor.currentMode)).forEach((block) => {
        mountCodeMirror(block as HTMLElement, vditor);
    });
    syncMathBlocksPreviewMode(editor);
};

/** @deprecated use renderCodeBlocks */
export const renderWysiwygCodeBlocks = renderCodeBlocks;

export const restoreCodeMirrorFocus = (
    blockElement: HTMLElement,
    anchor: number,
    head: number,
    vditor: IVditor,
) => {
    if (!blockElement) {
        return;
    }
    if (!bindings.get(blockElement)) {
        mountCodeMirror(blockElement, vditor);
    }
    const binding = bindings.get(blockElement);
    if (!binding) {
        return;
    }
    const apply = () => {
        const docLength = binding.view.state.doc.length;
        const safeAnchor = Math.max(0, Math.min(anchor, docLength));
        const safeHead = Math.max(0, Math.min(head, docLength));
        binding.view.dispatch({
            selection: { anchor: safeAnchor, head: safeHead },
            scrollIntoView: false,
        });
        focusCmViewWithoutScroll(binding.view);
    };
    preserveEditorScroll(vditor, apply);
};

export const focusCodeMirror = (
    blockElement: HTMLElement,
    collapseToStart = true,
    vditor?: IVditor,
) => {
    if (!blockElement) {
        return;
    }
    if (!bindings.get(blockElement) && vditor) {
        mountCodeMirror(blockElement, vditor);
    }
    const binding = bindings.get(blockElement);
    if (!binding) {
        return;
    }
    const hadFocus = binding.view.hasFocus;
    const applyFocus = () => {
        focusCmViewWithoutScroll(binding.view);
        if (!hadFocus) {
            if (collapseToStart) {
                binding.view.dispatch({
                    selection: { anchor: 0, head: 0 },
                    scrollIntoView: false,
                });
            } else {
                const length = binding.view.state.doc.length;
                binding.view.dispatch({
                    selection: { anchor: length, head: length },
                    scrollIntoView: false,
                });
            }
        }
    };
    if (vditor) {
        preserveEditorScroll(vditor, applyFocus);
    } else {
        applyFocus();
    }
};

/** @deprecated use focusCodeMirror */
export const focusWysiwygCodeMirror = focusCodeMirror;

export const focusCodeBlock = (blockElement: HTMLElement, vditor: IVditor, collapseToStart = true) => {
    if (isSpecialPreviewBlock(blockElement)) {
        return enterSpecialBlockEdit(vditor, blockElement);
    }
    if (!isCmCodeBlock(blockElement)) {
        return false;
    }
    focusCodeMirror(blockElement, collapseToStart, vditor);
    return true;
};

export const updateCodeMirrorLanguage = (blockElement: HTMLElement, languageName: string) => {
    const lang = languageName.trim();
    const binding = bindings.get(blockElement);
    if (binding) {
        binding.syncCode.className = lang ? `language-${lang}` : "";
        applyLanguage(blockElement, binding, lang);
    }
    const infoElement = blockElement.querySelector('[data-type="code-block-info"]') as HTMLElement;
    if (infoElement) {
        infoElement.textContent = Constants.ZWSP + lang;
    }
    updateCodeBlockChromeLanguage(blockElement, lang);
};

/** @deprecated use updateCodeMirrorLanguage */
export const updateWysiwygCodeMirrorLanguage = updateCodeMirrorLanguage;

export const hasCodeMirror = (blockElement: HTMLElement) => bindings.has(blockElement);

/** @deprecated use hasCodeMirror */
export const hasWysiwygCodeMirror = hasCodeMirror;

export const getCodeMirrorView = (blockElement: HTMLElement) => bindings.get(blockElement)?.view;

/** @deprecated use getCodeMirrorView */
export const getWysiwygCodeMirrorView = getCodeMirrorView;

const sanitizeCmBlockCloneForMarkdown = (liveBlock: HTMLElement, cloneBlock: HTMLElement) => {
    const binding = bindings.get(liveBlock);
    const parts = getBlockParts(liveBlock);
    if (!parts) {
        return;
    }
    const languageName = getCodeLanguageName(parts.code);
    const codeText = binding ? binding.view.state.doc.toString() : (parts.code.textContent || "");
    const clonePre = cloneBlock.querySelector("pre") as HTMLElement;
    if (!clonePre) {
        return;
    }
    const isWysiwygPre = clonePre.classList.contains("vditor-wysiwyg__pre") ||
        liveBlock.closest(".vditor-wysiwyg") !== null;
    clonePre.className = isWysiwygPre ? "vditor-wysiwyg__pre" : "vditor-ir__marker--pre";
    clonePre.removeAttribute("contenteditable");
    clonePre.style.display = "";
    const cloneCode = document.createElement("code");
    cloneCode.className = languageName ? `language-${languageName}` : "";
    cloneCode.textContent = codeText;
    clonePre.replaceChildren(cloneCode);
    cloneBlock.classList.remove(CM_BLOCK_CLASS);
    const infoElement = cloneBlock.querySelector('[data-type="code-block-info"]') as HTMLElement;
    if (infoElement) {
        infoElement.textContent = Constants.ZWSP + languageName;
    }
};

/** 复制时读取 CodeMirror 内部选区（DOM Selection 通常为空） */
export const getCodeMirrorSelectionTextForCopy = (vditor: IVditor) => {
    const editor = getModeEditor(vditor);
    if (!editor) {
        return null;
    }
    const blocks = editor.querySelectorAll(`.${CM_BLOCK_CLASS}[data-type='code-block']`);
    for (let i = 0; i < blocks.length; i++) {
        const view = getCodeMirrorView(blocks[i] as HTMLElement);
        if (!view) {
            continue;
        }
        const { from, to } = view.state.selection.main;
        if (from !== to) {
            return getCmSelectionText(view);
        }
    }
    return null;
};

/** 复制/导出前还原 CM 代码块 DOM，供 Lute 正确转为 Markdown */
export const sanitizeCodeBlocksInCopyFragment = (root: ParentNode, editor: HTMLElement) => {
    const liveBlocks = editor.querySelectorAll(`.${CM_BLOCK_CLASS}[data-type='code-block']`);
    const cloneBlocks = root.querySelectorAll("[data-type='code-block']");
    for (let i = 0; i < cloneBlocks.length; i++) {
        const cloneBlock = cloneBlocks[i] as HTMLElement;
        let liveBlock = cloneBlock.getAttribute("data-block") != null
            ? editor.querySelector(`[data-type='code-block'][data-block="${cloneBlock.getAttribute("data-block")}"]`) as HTMLElement | null
            : null;
        if (!liveBlock && i < liveBlocks.length) {
            liveBlock = liveBlocks[i] as HTMLElement;
        }
        if (liveBlock) {
            sanitizeCmBlockCloneForMarkdown(liveBlock, cloneBlock);
        }
    }
};

/** 保存/导出前将 CodeMirror 文档同步到隐藏的 sync code 节点 */
export const flushCodeMirrorToSyncCode = (vditor: IVditor) => {
    const editor = getModeEditor(vditor);
    if (!editor) {
        return;
    }
    for (const block of editor.querySelectorAll(`.${CM_BLOCK_CLASS}`)) {
        const binding = bindings.get(block as HTMLElement);
        if (!binding) {
            continue;
        }
        window.clearTimeout(binding.syncTimer);
        window.clearTimeout(binding.previewTimer);
        binding.syncCode.textContent = binding.view.state.doc.toString();
    }
};

/** 导出 Markdown 前同步 CM 状态；Lute 直接识别 CM DOM，无需再篡改 DOM */
export const buildEditorHtmlForMarkdown = (vditor: IVditor) => {
    flushCodeMirrorToSyncCode(vditor);
    const editor = getModeEditor(vditor);
    if (!editor) {
        return "";
    }
    const clone = editor.cloneNode(true) as HTMLElement;
    for (const el of clone.querySelectorAll(".vditor-cm-chrome, .cm-editor")) {
        el.remove();
    }
    for (const block of clone.querySelectorAll("[data-type='code-block'], [data-type='math-block']")) {
        block.querySelectorAll(".vditor-wysiwyg__preview, .vditor-ir__preview").forEach((preview) => {
            preview.remove();
        });
        const parts = getBlockParts(block as HTMLElement);
        if (parts?.editPre) {
            parts.editPre.style.display = "block";
            parts.code.removeAttribute("hidden");
            parts.code.style.display = "";
        }
    }
    return clone.innerHTML;
};
