import { Constants } from "../constants";
import { hidePanel } from "../toolbar/setToolbar";
import { isCtrl, isFirefox } from "../util/compatibility";
import {
    bindImageLoadingState,
    blurEvent,
    copyEvent, cutEvent, dblclickEvent,
    dropEvent,
    focusEvent,
    hotkeyEvent,
    selectEvent,
} from "../util/editorCommonEvent";
import { isHeadingMD, isHrMD, paste, splitHeadingOnNewline } from "../util/fixBrowserBehavior";
import {
    hasClosestBlock, hasClosestByAttribute,
    hasClosestByClassName, hasClosestByMatchTag,
} from "../util/hasClosest";
import { hasClosestByHeadings } from "../util/hasClosestByHeadings";
import { isDeleteInput } from "../util/instantHistory";
import { flushBufferedHistory, trackHistoryInputFromEvent } from "../util/historyInputBuffer";
import {
    preventImpreciseLineStartClick,
    getCursorPosition,
    getEditorRange,
    getSelectPosition,
    setRangeByWbr,
} from "../util/selection";
import { clickToc, renderToc } from "../util/toc";
import { afterRenderEvent } from "./afterRenderEvent";
import { genAPopover, genImagePopover, genLinkRefPopover, highlightToolbarWYSIWYG } from "./highlightToolbarWYSIWYG";
import { getRenderElementNextNode, modifyPre } from "./inlineTag";
import { input } from "./input";
import {
    focusCodeBlock, isCmCodeBlock, isInsideCodeBlockChrome, isInsideCodeMirror,
    getCodeMirrorSelectionTextForCopy,
    sanitizeCodeBlocksInCopyFragment,
} from "../codeBlock/codeMirrorManager";
import { focusWysiwygCodeBlock, showCode } from "./showCode";
import { getMarkdown } from "../markdown/getMarkdown";
import { initBlockHandle } from "./blockHandle";
import { initTableHandle } from "./tableHandle";

class WYSIWYG {
    public range: Range;
    public element: HTMLPreElement;
    public popover: HTMLDivElement;
    public afterRenderTimeoutId: number;
    public afterRenderLastAt = 0;
    public hlToolbarTimeoutId: number;
    public preventInput: boolean;
    public composingLock = false;
    private scrollListener: () => void;
    private impreciseLineClickHandled = false;

    constructor(vditor: IVditor) {
        const divElement = document.createElement("div");
        divElement.className = "vditor-wysiwyg";

        divElement.innerHTML = `<pre class="vditor-reset" placeholder="${vditor.options.placeholder}"
 contenteditable="true" spellcheck="false"></pre>
<div class="vditor-panel vditor-panel--none"></div>`;

        this.element = divElement.firstElementChild as HTMLPreElement;
        this.popover = divElement.lastElementChild as HTMLDivElement;

        this.bindEvent(vditor);

        initBlockHandle(vditor, divElement, this.element);
        initTableHandle(vditor, divElement, this.element);

        focusEvent(vditor, this.element);
        dblclickEvent(vditor, this.element);
        blurEvent(vditor, this.element);
        hotkeyEvent(vditor, this.element);
        selectEvent(vditor, this.element);
        dropEvent(vditor, this.element);
        copyEvent(vditor, this.element, this.copy);
        cutEvent(vditor, this.element, this.copy);
        bindImageLoadingState(this.element);
    }

    public unbindListener() {
        window.removeEventListener("scroll", this.scrollListener);
    }

    private copy(event: ClipboardEvent, vditor: IVditor) {
        const cmSelectionText = getCodeMirrorSelectionTextForCopy(vditor);

        if (isInsideCodeMirror(event.target)) {
            if (!event.defaultPrevented && cmSelectionText) {
                event.preventDefault();
                event.stopPropagation();
                event.clipboardData.setData("text/plain", cmSelectionText);
                event.clipboardData.setData("text/html", "");
            }
            return;
        }

        const range = getSelection().getRangeAt(0);
        if (range.toString() === "") {
            if (cmSelectionText) {
                event.preventDefault();
                event.stopPropagation();
                event.clipboardData.setData("text/plain", cmSelectionText);
                event.clipboardData.setData("text/html", "");
            }
            return;
        }
        event.stopPropagation();
        event.preventDefault();

        const codeElement = hasClosestByMatchTag(range.startContainer, "CODE");
        const codeEndElement = hasClosestByMatchTag(range.endContainer, "CODE");
        if (codeElement && codeEndElement && codeEndElement.isSameNode(codeElement)) {
            let codeText = "";
            if (codeElement.parentElement.tagName === "PRE") {
                codeText = range.toString();
            } else {
                codeText = "`" + range.toString() + "`";
            }
            event.clipboardData.setData("text/plain", codeText);
            event.clipboardData.setData("text/html", "");
            return;
        }

        const aElement = hasClosestByMatchTag(range.startContainer, "A");
        const aEndElement = hasClosestByMatchTag(range.endContainer, "A");
        if (aElement && aEndElement && aEndElement.isSameNode(aElement)) {
            let aTitle = aElement.getAttribute("title") || "";
            if (aTitle) {
                aTitle = ` "${aTitle}"`;
            }
            event.clipboardData.setData("text/plain",
                `[${range.toString()}](${aElement.getAttribute("href")}${aTitle})`);
            event.clipboardData.setData("text/html", "");
            return;
        }

        const tempElement = document.createElement("div");
        tempElement.appendChild(range.cloneContents());
        sanitizeCodeBlocksInCopyFragment(tempElement, vditor.wysiwyg.element);

        event.clipboardData.setData("text/plain", vditor.lute.VditorDOM2Md(tempElement.innerHTML).trim());
        event.clipboardData.setData("text/html", "");
    }

    private bindEvent(vditor: IVditor) {
        this.unbindListener();
        window.addEventListener("scroll", this.scrollListener = () => {
            hidePanel(vditor, ["hint"]);
            if (this.popover.style.display !== "block") {
                return;
            }
            const top = parseInt(this.popover.getAttribute("data-top"), 10);
            if (vditor.options.height !== "auto") {
                if (vditor.options.toolbarConfig.pin && vditor.toolbar.element.getBoundingClientRect().top === 0) {
                    this.popover.style.top = Math.max(window.scrollY - vditor.element.offsetTop - 8,
                        Math.min(top - vditor.wysiwyg.element.scrollTop, this.element.clientHeight - 21)) + "px";
                }
                return;
            } else if (!vditor.options.toolbarConfig.pin) {
                return;
            }
            this.popover.style.top = Math.max(top, (window.scrollY - vditor.element.offsetTop - 8)) + "px";
        });

        this.element.addEventListener("scroll", () => {
            hidePanel(vditor, ["hint"]);
            if (this.popover.style.display !== "block") {
                return;
            }
            const top = parseInt(this.popover.getAttribute("data-top"), 10) - vditor.wysiwyg.element.scrollTop;
            let max = -8;
            if (vditor.options.toolbarConfig.pin && vditor.toolbar.element.getBoundingClientRect().top === 0) {
                max = window.scrollY - vditor.element.offsetTop + max;
            }
            this.popover.style.top = Math.max(max, Math.min(top, this.element.clientHeight - 21)) + "px";
        });

        this.element.addEventListener("paste", (event: ClipboardEvent & { target: HTMLElement }) => {
            paste(vditor, event, {
                pasteCode: (code: string) => {
                    const range = getEditorRange(vditor);
                    const node = document.createElement("template");
                    node.innerHTML = code;
                    range.insertNode(node.content.cloneNode(true));
                    const blockElement = hasClosestByAttribute(range.startContainer, "data-block", "0");
                    if (blockElement) {
                        blockElement.outerHTML = vditor.lute.SpinVditorDOM(blockElement.outerHTML);
                    } else {
                        vditor.wysiwyg.element.innerHTML = vditor.lute.SpinVditorDOM(vditor.wysiwyg.element.innerHTML);
                    }
                    setRangeByWbr(vditor.wysiwyg.element, range);
                },
            });
        });

        // 中文处理
        this.element.addEventListener("compositionstart", () => {
            this.composingLock = true;
        });

        this.element.addEventListener("compositionend", (event: InputEvent) => {
            if (isInsideCodeMirror(event.target) || isInsideCodeBlockChrome(event.target)) {
                return;
            }
            const headingElement = hasClosestByHeadings(getSelection().getRangeAt(0).startContainer);
            if (headingElement && headingElement.textContent === "") {
                // heading 为空删除 https://github.com/Vanessa219/vditor/issues/150
                renderToc(vditor);
                return;
            }
            if (!isFirefox()) {
                input(vditor, getSelection().getRangeAt(0).cloneRange(), event);
            }
            this.composingLock = false;
        });

        this.element.addEventListener("input", (event: InputEvent) => {
            if (isInsideCodeMirror(event.target) || isInsideCodeBlockChrome(event.target)) {
                return;
            }
            if (event.inputType === "deleteByDrag" || event.inputType === "insertFromDrop") {
                // https://github.com/Vanessa219/vditor/issues/801 编辑器内容拖拽问题
                return;
            }
            const recordInstantDelete = isDeleteInput(event);
            if (recordInstantDelete) {
                trackHistoryInputFromEvent(vditor, event);
            }
            if (this.preventInput) {
                this.preventInput = false;
                afterRenderEvent(vditor);
                return;
            }
            if (this.composingLock || event.data === "‘" || event.data === "“" || event.data === "《") {
                afterRenderEvent(vditor);
                return;
            }
            const range = getSelection().getRangeAt(0);
            let blockElement = hasClosestBlock(range.startContainer);
            if (!blockElement) {
                // 没有被块元素包裹
                modifyPre(vditor, range);
                blockElement = hasClosestBlock(range.startContainer);
            }
            if (!blockElement) {
                return;
            }

            let shouldFlushHistory = false;
            if (!recordInstantDelete) {
                shouldFlushHistory = trackHistoryInputFromEvent(vditor, event);
            }

            // 前后空格处理
            const startOffset = getSelectPosition(blockElement, vditor.wysiwyg.element, range).start;

            // 开始可以输入空格
            let startSpace = true;
            for (let i = startOffset - 1; i > blockElement.textContent.substr(0, startOffset).lastIndexOf("\n"); i--) {
                if (blockElement.textContent.charAt(i) !== " " &&
                    // 多个 tab 前删除不形成代码块 https://github.com/Vanessa219/vditor/issues/162 1
                    blockElement.textContent.charAt(i) !== "\t") {
                    startSpace = false;
                    break;
                }
            }
            if (startOffset === 0) {
                startSpace = false;
            }

            // 结尾可以输入空格
            let endSpace = true;
            for (let i = startOffset - 1; i < blockElement.textContent.length; i++) {
                if (blockElement.textContent.charAt(i) !== " " && blockElement.textContent.charAt(i) !== "\n") {
                    endSpace = false;
                    break;
                }
            }

            const headingElement = hasClosestByHeadings(getSelection().getRangeAt(0).startContainer);
            if (headingElement && headingElement.textContent === "") {
                // heading 为空删除 https://github.com/Vanessa219/vditor/issues/150
                renderToc(vditor);
                headingElement.remove();
            } else if (headingElement && splitHeadingOnNewline(vditor, headingElement)) {
                renderToc(vditor);
            }

            if ((startSpace && blockElement.getAttribute("data-type") !== "code-block")
                || endSpace || isHeadingMD(blockElement.innerHTML) ||
                (isHrMD(blockElement.innerHTML) && blockElement.previousElementSibling)) {
                if (typeof vditor.options.input === "function") {
                    vditor.options.input(getMarkdown(vditor));
                }
                if (shouldFlushHistory) {
                    flushBufferedHistory(vditor);
                } else {
                    afterRenderEvent(vditor);
                }
                return;
            }

            input(vditor, range, event);
            if (shouldFlushHistory) {
                flushBufferedHistory(vditor);
            }
        });

        this.element.addEventListener("mousedown", (event: MouseEvent & { target: HTMLElement }) => {
            if (isInsideCodeMirror(event.target) || isInsideCodeBlockChrome(event.target)) {
                return;
            }
            this.impreciseLineClickHandled = preventImpreciseLineStartClick(event, this.element);
        }, true);

        this.element.addEventListener("mouseup", (event: MouseEvent) => {
            if (this.impreciseLineClickHandled) {
                event.preventDefault();
                this.impreciseLineClickHandled = false;
            }
        }, true);

        this.element.addEventListener("click", (event: MouseEvent & { target: HTMLElement }) => {
            if (event.target.tagName === "INPUT") {
                const checkElement = event.target as HTMLInputElement;
                if (checkElement.checked) {
                    checkElement.setAttribute("checked", "checked");
                } else {
                    checkElement.removeAttribute("checked");
                }
                this.preventInput = true;
                afterRenderEvent(vditor);
                return;
            }

            if (event.target.tagName === "IMG" &&
                // plantuml 图片渲染不进行提示
                !event.target.parentElement.classList.contains("vditor-wysiwyg__preview")) {
                if (event.target.getAttribute("data-type") === "link-ref") {
                    genLinkRefPopover(vditor, event.target);
                } else {
                    genImagePopover(event, vditor);
                }
                return;
            }

            const range = getEditorRange(vditor);
            if (event.target.isEqualNode(this.element) && this.element.lastElementChild && range.collapsed) {
                const lastRect = this.element.lastElementChild.getBoundingClientRect();
                if (event.y > lastRect.top + lastRect.height) {
                    if (this.element.lastElementChild.tagName === "P" &&
                        this.element.lastElementChild.textContent.trim().replace(Constants.ZWSP, "") === "") {
                        range.selectNodeContents(this.element.lastElementChild);
                        range.collapse(false);
                    } else {
                        this.element.insertAdjacentHTML("beforeend",
                            `<p data-block="0">${Constants.ZWSP}<wbr></p>`);
                        setRangeByWbr(this.element, range);
                    }
                }
            }

            const cmBlock = (event.target as HTMLElement).closest?.("[data-type='code-block']") as HTMLElement;
            if (isCmCodeBlock(cmBlock)) {
                if (!isInsideCodeMirror(event.target) && !isInsideCodeBlockChrome(event.target)) {
                    highlightToolbarWYSIWYG(vditor);
                    focusWysiwygCodeBlock(cmBlock, vditor);
                }
                clickToc(event, vditor);
                return;
            }

            const linkRefElement = hasClosestByAttribute(event.target, "data-type", "link-ref");
            if (linkRefElement) {
                genLinkRefPopover(vditor, linkRefElement as HTMLElement);
            } else {
                const aElement = hasClosestByMatchTag(event.target, "A");
                if (aElement) {
                    genAPopover(vditor, aElement as HTMLElement);
                }
            }

            highlightToolbarWYSIWYG(vditor);

            // 点击后光标落于预览区，需展开代码块（仅特殊语言块）
            let previewElement = hasClosestByClassName(event.target, "vditor-wysiwyg__preview");
            if (!previewElement) {
                previewElement =
                    hasClosestByClassName(getEditorRange(vditor).startContainer, "vditor-wysiwyg__preview");
            }
            if (previewElement) {
                const blockElement = previewElement.closest("[data-type='code-block']") as HTMLElement;
                if (!focusWysiwygCodeBlock(blockElement, vditor)) {
                    showCode(previewElement, vditor);
                }
            }

            clickToc(event, vditor);
        });

        this.element.addEventListener("keyup", (event: KeyboardEvent & { target: HTMLElement }) => {
            if (event.isComposing || isCtrl(event)) {
                return;
            }
            if (isInsideCodeMirror(event.target) || isInsideCodeBlockChrome(event.target)) {
                return;
            }
            if ((event.key === "Backspace" || event.key === "Delete") &&
                vditor.wysiwyg.element.innerHTML !== "" && vditor.wysiwyg.element.childNodes.length === 1 &&
                vditor.wysiwyg.element.firstElementChild && vditor.wysiwyg.element.firstElementChild.tagName === "P"
                && vditor.wysiwyg.element.firstElementChild.childElementCount === 0
                && (vditor.wysiwyg.element.textContent === "" || vditor.wysiwyg.element.textContent === "\n")) {
                // 为空时显示 placeholder
                vditor.wysiwyg.element.innerHTML = "";
            }
            const range = getEditorRange(vditor);
            if (event.key === "Backspace") {
                // firefox headings https://github.com/Vanessa219/vditor/issues/211
                if (isFirefox() && range.startContainer.textContent === "\n" && range.startOffset === 1) {
                    range.startContainer.textContent = "";
                }
            }

            // 没有被块元素包裹
            modifyPre(vditor, range);

            highlightToolbarWYSIWYG(vditor);

            if (event.key !== "ArrowDown" && event.key !== "ArrowRight" && event.key !== "Backspace"
                && event.key !== "ArrowLeft" && event.key !== "ArrowUp") {
                return;
            }

            if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                vditor.hint.render(vditor);
            }

            // 上下左右，删除遇到块预览的处理
            let previewElement = hasClosestByClassName(range.startContainer, "vditor-wysiwyg__preview");
            if (!previewElement && range.startContainer.nodeType !== 3 && range.startOffset > 0) {
                // table 前删除遇到代码块
                const blockRenderElement = range.startContainer as HTMLElement;
                if (blockRenderElement.classList.contains("vditor-wysiwyg__block")) {
                    previewElement = blockRenderElement.lastElementChild as HTMLElement;
                }
            }
            if (!previewElement) {
                return;
            }
            const blockElement = previewElement.closest("[data-type='code-block']") as HTMLElement;
            if (isCmCodeBlock(blockElement)) {
                if (event.key === "ArrowDown" || event.key === "ArrowRight") {
                    focusWysiwygCodeBlock(blockElement, vditor, true);
                } else if (event.key === "ArrowUp" || event.key === "ArrowLeft" || event.key === "Backspace") {
                    focusWysiwygCodeBlock(blockElement, vditor, false);
                }
                event.preventDefault();
                return;
            }
            const previousElement = previewElement.previousElementSibling as HTMLElement;
            if (previousElement.style.display === "none") {
                if (event.key === "ArrowDown" || event.key === "ArrowRight") {
                    showCode(previewElement, vditor);
                } else {
                    showCode(previewElement, vditor, false);
                }
                return;
            }

            let codeElement = previewElement.previousElementSibling as HTMLElement;
            if (codeElement.tagName === "PRE") {
                codeElement = codeElement.firstElementChild as HTMLElement;
            }

            if (event.key === "ArrowDown" || event.key === "ArrowRight") {
                const blockRenderElement = previewElement.parentElement;
                let nextNode = getRenderElementNextNode(blockRenderElement) as HTMLElement;
                if (nextNode && nextNode.nodeType !== 3) {
                    const nextRenderElement = nextNode.querySelector(".vditor-wysiwyg__preview") as HTMLElement;
                    if (nextRenderElement) {
                        const nextBlock = nextRenderElement.closest("[data-type='code-block']") as HTMLElement;
                        if (!focusWysiwygCodeBlock(nextBlock, vditor)) {
                            showCode(nextRenderElement, vditor);
                        }
                        return;
                    }
                }
                if (nextNode.nodeType === 3) {
                    while (nextNode.textContent.length === 0 && nextNode.nextSibling) {
                        nextNode = nextNode.nextSibling as HTMLElement;
                    }
                    range.setStart(nextNode, 1);
                } else {
                    range.setStart(nextNode.firstChild, 0);
                }
            } else {
                range.selectNodeContents(codeElement);
                range.collapse(false);
            }
        });
    }
}

export { WYSIWYG };
