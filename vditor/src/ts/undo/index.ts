import {diff_match_patch, patch_obj} from "diff-match-patch";
import {
    canRedoActiveCodeMirror,
    canUndoActiveCodeMirror,
    deactivateAllCodeMirrors,
    isInsideCodeMirror,
    redoActiveCodeMirror,
    remountCodeMirrorsAfterDomReplace,
    undoActiveCodeMirror,
} from "../codeBlock/codeMirrorManager";
import {disableToolbar, enableToolbar, hidePanel} from "../toolbar/setToolbar";
import {isFirefox, isSafari} from "../util/compatibility";
import {execAfterRender} from "../util/fixBrowserBehavior";
import {highlightToolbar} from "../util/highlightToolbar";
import {processCodeRender} from "../util/processCode";
import {setRangeByWbr, setSelectionFocus} from "../util/selection";
import {renderToc} from "../util/toc";
import {formatMs, logPerf} from "../util/log";

interface IUndo {
    hasUndo: boolean;
    lastCaret?: number;
    lastText: string;
    redoStack: IUndoRecord[];
    undoStack: IUndoRecord[];
}

interface IUndoRecord {
    caret?: number;
    patches: patch_obj[];
}

class Undo {
    private stackSize = 50;
    private dmp: diff_match_patch;
    private wysiwyg: IUndo;
    private ir: IUndo;
    private raw: IUndo;

    constructor() {
        this.resetStack();
        this.dmp = new diff_match_patch();
    }

    public clearStack(vditor: IVditor) {
        this.resetStack();
        this.resetIcon(vditor);
    }

    public resetIcon(vditor: IVditor) {
        if (!vditor.toolbar) {
            return;
        }
        if (this[vditor.currentMode].undoStack.length > 1 ||
            (vditor.currentMode !== "raw" && canUndoActiveCodeMirror())) {
            enableToolbar(vditor.toolbar.elements, ["undo"]);
        } else {
            disableToolbar(vditor.toolbar.elements, ["undo"]);
        }

        if (this[vditor.currentMode].redoStack.length !== 0 ||
            (vditor.currentMode !== "raw" && canRedoActiveCodeMirror())) {
            enableToolbar(vditor.toolbar.elements, ["redo"]);
        } else {
            disableToolbar(vditor.toolbar.elements, ["redo"]);
        }
    }

    public undo(vditor: IVditor) {
        if (vditor.currentMode === "raw" && vditor.raw.element.disabled) {
            return;
        }
        if (vditor.currentMode === "raw") {
            vditor.raw.flushPendingRecord(vditor);
        }
        if (vditor.currentMode !== "raw" &&
            vditor[vditor.currentMode].element.getAttribute("contenteditable") === "false") {
            return;
        }
        if (vditor.currentMode !== "raw" && isInsideCodeMirror(document.activeElement)) {
            undoActiveCodeMirror();
            this.resetIcon(vditor);
            return;
        }
        if (this[vditor.currentMode].undoStack.length < 2) {
            return;
        }
        const state = this[vditor.currentMode].undoStack.pop();
        if (!state) {
            return;
        }
        this[vditor.currentMode].redoStack.push(state);
        const targetState = this[vditor.currentMode].undoStack[this[vditor.currentMode].undoStack.length - 1];
        this.renderDiff(state, vditor, false, targetState);
        this[vditor.currentMode].hasUndo = true;
        // undo 操作后，需要关闭 hint
        hidePanel(vditor, ["hint"]);
    }

    public redo(vditor: IVditor) {
        if (vditor.currentMode === "raw" && vditor.raw.element.disabled) {
            return;
        }
        if (vditor.currentMode === "raw") {
            vditor.raw.flushPendingRecord(vditor);
        }
        if (vditor.currentMode !== "raw" &&
            vditor[vditor.currentMode].element.getAttribute("contenteditable") === "false") {
            return;
        }
        if (vditor.currentMode !== "raw" && isInsideCodeMirror(document.activeElement)) {
            redoActiveCodeMirror();
            this.resetIcon(vditor);
            return;
        }
        const state = this[vditor.currentMode].redoStack.pop();
        if (!state) {
            return;
        }
        this[vditor.currentMode].undoStack.push(state);
        this.renderDiff(state, vditor, true, state);
    }

    public recordFirstPosition(vditor: IVditor, event: KeyboardEvent) {
        if (vditor.currentMode === "raw" || getSelection().rangeCount === 0) {
            return;
        }
        if (this[vditor.currentMode].undoStack.length !== 1 ||
            this[vditor.currentMode].undoStack[0].patches.length === 0 ||
            this[vditor.currentMode].redoStack.length > 0) {
            return;
        }
        if (isFirefox() && event.key === "Backspace") {
            // Firefox 第一次删除无效
            return;
        }
        if (isSafari()) {
            // Safari keydown 在 input 之后，不需要重复记录历史
            return;
        }
        const text = this.addCaret(vditor);
        if (text.replace("<wbr>", "").replace(" vditor-ir__node--expand", "")
            !== this[vditor.currentMode].undoStack[0].patches[0].diffs[0][1].replace("<wbr>", "")) {
            // 当还不没有存入 undo 栈时，按下 ctrl 后会覆盖 lastText
            return;
        }
        this[vditor.currentMode].undoStack[0].patches[0].diffs[0][1] = text;
        this[vditor.currentMode].lastText = text;
        // 不能添加 setSelectionFocus(cloneRange); 否则 windows chrome 首次输入会烂
    }

    public addToUndoStack(vditor: IVditor) {
        // afterRenderEvent.ts 已经 debounce
        const debug = vditor.options.debugger;
        const totalStart = debug ? performance.now() : 0;

        let stepStart = debug ? performance.now() : 0;
        const text = this.addCaret(vditor, true);
        const caret = vditor.currentMode === "raw" ? this.getRawCaret(vditor) : undefined;
        const addCaretMs = debug ? performance.now() - stepStart : 0;

        stepStart = debug ? performance.now() : 0;
        const diff = this.dmp.diff_main(text, this[vditor.currentMode].lastText, true);
        const diffMainMs = debug ? performance.now() - stepStart : 0;

        stepStart = debug ? performance.now() : 0;
        const patchList = this.dmp.patch_make(text, this[vditor.currentMode].lastText, diff);
        const patchMakeMs = debug ? performance.now() - stepStart : 0;

        if (patchList.length === 0 && this[vditor.currentMode].undoStack.length > 0) {
            if (vditor.currentMode === "raw") {
                this.raw.lastCaret = caret;
                this.raw.undoStack[this.raw.undoStack.length - 1].caret = caret;
            }
            logPerf(debug, "[vditor undo] addToUndoStack skipped (no diff)", {
                addCaretMs: formatMs(addCaretMs),
                diffMainMs: formatMs(diffMainMs),
                patchMakeMs: formatMs(patchMakeMs),
                totalMs: formatMs(debug ? performance.now() - totalStart : 0),
            });
            return;
        }

        stepStart = debug ? performance.now() : 0;
        this[vditor.currentMode].lastText = text;
        if (vditor.currentMode === "raw") {
            this.raw.lastCaret = caret;
        }
        this[vditor.currentMode].undoStack.push({
            caret,
            patches: patchList,
        });
        if (this[vditor.currentMode].undoStack.length > this.stackSize) {
            this[vditor.currentMode].undoStack.shift();
        }
        if (this[vditor.currentMode].hasUndo) {
            this[vditor.currentMode].redoStack = [];
            this[vditor.currentMode].hasUndo = false;
            disableToolbar(vditor.toolbar.elements, ["redo"]);
        }

        if (this[vditor.currentMode].undoStack.length > 1) {
            enableToolbar(vditor.toolbar.elements, ["undo"]);
        }
        const stackUpdateMs = debug ? performance.now() - stepStart : 0;

        logPerf(debug, "[vditor undo] addToUndoStack", {
            addCaretMs: formatMs(addCaretMs),
            diffMainMs: formatMs(diffMainMs),
            patchMakeMs: formatMs(patchMakeMs),
            stackUpdateMs: formatMs(stackUpdateMs),
            totalMs: formatMs(debug ? performance.now() - totalStart : 0),
        });
    }

    private renderDiff(
        state: IUndoRecord,
        vditor: IVditor,
        isRedo: boolean = false,
        targetState?: IUndoRecord,
    ) {
        let text;
        if (isRedo) {
            const redoPatchList = this.dmp.patch_deepCopy(state.patches).reverse();
            redoPatchList.forEach((patch) => {
                patch.diffs.forEach((diff) => {
                    diff[0] = -diff[0];
                });
            });
            text = this.dmp.patch_apply(redoPatchList, this[vditor.currentMode].lastText)[0];
        } else {
            text = this.dmp.patch_apply(state.patches, this[vditor.currentMode].lastText)[0];
        }

        this[vditor.currentMode].lastText = text;
        if (vditor.currentMode === "wysiwyg" || vditor.currentMode === "ir") {
            deactivateAllCodeMirrors(vditor);
        }
        if (vditor.currentMode === "raw") {
            this.renderRawText(text, vditor, targetState?.caret);
            return;
        }
        vditor[vditor.currentMode].element.innerHTML = text;
        if (vditor.currentMode === "wysiwyg" || vditor.currentMode === "ir") {
            remountCodeMirrorsAfterDomReplace(vditor);
        }
        vditor[vditor.currentMode].element.querySelectorAll(`.vditor-${vditor.currentMode}__preview[data-render='2']`)
            .forEach((blockElement: HTMLElement) => {
                processCodeRender(blockElement, vditor);
            });

        if (!vditor[vditor.currentMode].element.querySelector("wbr")) {
            // Safari 第一次输入没有光标，需手动定位到结尾
            const range = getSelection().getRangeAt(0);
            range.setEndBefore(vditor[vditor.currentMode].element);
            range.collapse(false);
        } else {
            setRangeByWbr(
                vditor[vditor.currentMode].element, vditor[vditor.currentMode].element.ownerDocument.createRange());
        }

        renderToc(vditor);

        execAfterRender(vditor, {
            enableAddUndoStack: false,
            enableHint: false,
            enableInput: true,
        });
        highlightToolbar(vditor);

        vditor[vditor.currentMode].element.querySelectorAll(`.vditor-${vditor.currentMode}__preview[data-render='2']`)
            .forEach((item: HTMLElement) => {
                processCodeRender(item, vditor);
            });

        this.resetIcon(vditor);
    }

    private resetStack() {
        this.ir = {
            hasUndo: false,
            lastCaret: undefined,
            lastText: "",
            redoStack: [],
            undoStack: [],
        };
        this.raw = {
            hasUndo: false,
            lastCaret: undefined,
            lastText: "",
            redoStack: [],
            undoStack: [],
        };
        this.wysiwyg = {
            hasUndo: false,
            lastCaret: undefined,
            lastText: "",
            redoStack: [],
            undoStack: [],
        };
    }

    private addCaret(vditor: IVditor, setFocus = false) {
        if (vditor.currentMode === "raw") {
            return vditor.raw.element.value;
        }

        let cloneRange: Range;
        if (getSelection().rangeCount !== 0 && !vditor[vditor.currentMode].element.querySelector("wbr")) {
            const range = getSelection().getRangeAt(0);
            if (vditor[vditor.currentMode].element.contains(range.startContainer) &&
                !isInsideCodeMirror(range.startContainer)) {
                cloneRange = range.cloneRange();
                const wbrElement = document.createElement("span");
                wbrElement.className = "vditor-wbr";
                range.insertNode(wbrElement);
            }
        }
        // 移除数学公式、plantuml 渲染 https://github.com/siyuan-note/siyuan/issues/537
        const cloneElement = vditor[vditor.currentMode].element.cloneNode(true) as HTMLElement;
        cloneElement.querySelectorAll(`.vditor-${vditor.currentMode}__preview[data-render='1']`)
            .forEach((item: HTMLElement) => {
                if (!item.firstElementChild) {
                    return;
                }
                if (item.firstElementChild.classList.contains("language-plantuml")) {
                    item.firstElementChild.removeAttribute("data-processed");
                    const sourceElement = item.previousElementSibling?.firstElementChild;
                    item.firstElementChild.innerHTML = sourceElement?.innerHTML || "";
                    item.setAttribute("data-render", "2");
                } else if (item.firstElementChild.classList.contains("language-math")) {
                    item.setAttribute("data-render", "2");
                    item.firstElementChild.textContent = item.firstElementChild.getAttribute("data-math");
                    item.firstElementChild.removeAttribute("data-math");
                }
            });
        const text = cloneElement.innerHTML;
        vditor[vditor.currentMode].element.querySelectorAll(".vditor-wbr").forEach((item) => {
            item.remove();
            // 使用 item.outerHTML = "" 会产生 https://github.com/Vanessa219/vditor/pull/686;
        });
        if (setFocus && cloneRange) {
            setSelectionFocus(cloneRange);
        }
        return text.replace('<span class="vditor-wbr"></span>', "<wbr>");
    }

    private getRawCaret(vditor: IVditor) {
        return vditor.raw.element.selectionStart ?? vditor.raw.element.value.length;
    }

    private renderRawText(text: string, vditor: IVditor, caret = text.length) {
        const nextCaret = Math.max(0, Math.min(caret, text.length));
        this.raw.lastText = text;
        this.raw.lastCaret = nextCaret;
        vditor.raw.element.value = text;
        vditor.raw.record(vditor, true, false);
        vditor.raw.element.focus();
        vditor.raw.element.setSelectionRange(nextCaret, nextCaret);

        hidePanel(vditor, ["hint"]);
        this.resetIcon(vditor);
    }
}

export {Undo};
