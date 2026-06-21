import { Constants } from "../constants";
import { focusCodeBlockLanguageInput } from "../codeBlock/codeBlockLanguagePopover";
import { tryFocusAdjacentCodeMirror } from "../codeBlock/codeMirrorNavigation";
import {
    focusCodeMirror,
    getCodeMirrorView,
    hasCodeMirror,
    isCmCodeBlock,
    isInsideCodeBlockChrome,
    isInsideCodeMirror,
} from "../codeBlock/codeMirrorManager";
import { isCtrl, isFirefox } from "../util/compatibility";
import {
    fixBlockquote, fixCJKPosition,
    fixCodeBlock, fixCursorDownInlineMath, fixDelete, fixFirefoxArrowUpTable, fixGSKeyBackspace, fixHR,
    fixHeadingEnter,
    fixList,
    fixMarkdown,
    fixTab,
    fixTable,
    fixTask, insertAfterBlock, insertBeforeBlock,
} from "../util/fixBrowserBehavior";
import {
    hasClosestBlock,
    hasClosestByAttribute,
    hasClosestByClassName,
    hasClosestByMatchTag,
    hasTopClosestByTag,
} from "../util/hasClosest";
import { hasClosestByHeadings } from "../util/hasClosestByHeadings";
import { matchHotKey } from "../util/hotKey";
import { recordHistoryChange, recordHistoryPosition } from "../util/instantHistory";
import { getEditorRange, getSelectPosition, setSelectionFocus } from "../util/selection";
import { keydownToc, renderToc } from "../util/toc";
import { afterRenderEvent } from "./afterRenderEvent";
import { moveDown, moveUp, genAPopover, genLinkRefPopover } from "./highlightToolbarWYSIWYG";
import { nextIsCode } from "./inlineTag";
import { removeHeading, setHeading } from "./setHeading";
import { focusWysiwygCodeBlock, showCode } from "./showCode";

export const processKeydown = (vditor: IVditor, event: KeyboardEvent) => {
    // Chrome firefox 触发 compositionend 机制不一致 https://github.com/Vanessa219/vditor/issues/188
    vditor.wysiwyg.composingLock = event.isComposing;
    if (event.isComposing) {
        return false;
    }

    if (isInsideCodeBlockChrome(event.target)) {
        event.stopPropagation();
        return true;
    }

    if (isInsideCodeMirror(event.target)) {
        const codeRenderElement = (event.target as HTMLElement).closest("[data-type='code-block']") as HTMLElement;
        if (matchHotKey("⌘A", event)) {
            event.stopPropagation();
            return true;
        }
        if (event.key === "Escape" && codeRenderElement) {
            vditor.wysiwyg.popover.style.display = "none";
            getCodeMirrorView(codeRenderElement)?.contentDOM.blur();
            event.preventDefault();
            return true;
        }
        if (!isCtrl(event) && !event.shiftKey && event.altKey && event.key === "Enter" && codeRenderElement) {
            if (focusCodeBlockLanguageInput(vditor)) {
                event.preventDefault();
                return true;
            }
        }
        return false;
    }

    // 添加第一次记录 undo 的光标
    if (event.key.indexOf("Arrow") === -1 && event.key !== "Meta" && event.key !== "Control" && event.key !== "Alt" &&
        event.key !== "Shift" && event.key !== "CapsLock" && event.key !== "Escape" && !/^F\d{1,2}$/.test(event.key)) {
        vditor.undo.recordFirstPosition(vditor, event);
    }

    const range = getEditorRange(vditor);
    const startContainer = range.startContainer;

    if (!fixGSKeyBackspace(event, vditor, startContainer)) {
        return false;
    }

    fixCJKPosition(range, vditor, event);

    fixHR(range);

    // 对有子工具栏的块上移
    if (matchHotKey("^⌘i", event) || matchHotKey("^!i", event)) {
        moveUp(range, vditor);
        event.stopPropagation();
    }

    // 对有子工具栏的块下移
    if (matchHotKey("^⌘j", event) || matchHotKey("^!j", event)) {
        moveDown(range, vditor);
        event.stopPropagation();
    }

    // 仅处理以下快捷键操作
    if (event.key !== "Enter" && event.key !== "Tab" && event.key !== "Backspace" && event.key.indexOf("Arrow") === -1
        && !isCtrl(event) && event.key !== "Escape" && event.key !== "Delete") {
        return false;
    }
    if ((event.key === "Backspace" || event.key === "Delete") && !isCtrl(event) && !event.shiftKey && !event.altKey) {
        recordHistoryPosition(vditor);
    }

    const blockElement = hasClosestBlock(startContainer);
    const pElement = hasClosestByMatchTag(startContainer, "P");

    if (tryFocusAdjacentCodeMirror(vditor, event, range)) {
        return true;
    }

    // md 处理
    if (fixMarkdown(event, vditor, pElement, range)) {
        return true;
    }

    // li
    if (fixList(range, vditor, pElement, event)) {
        return true;
    }

    // table
    if (fixTable(vditor, event, range)) {
        return true;
    }

    // code render
    const codeRenderElement = hasClosestByClassName(startContainer, "vditor-wysiwyg__block");
    if (codeRenderElement) {
        // esc: 退出编辑
        if (event.key === "Escape" && codeRenderElement.getAttribute("data-type") === "code-block") {
            vditor.wysiwyg.popover.style.display = "none";
            if (hasCodeMirror(codeRenderElement) || isCmCodeBlock(codeRenderElement)) {
                getCodeMirrorView(codeRenderElement)?.contentDOM.blur();
                event.preventDefault();
                return true;
            }
            if (codeRenderElement.children.length === 2) {
                (codeRenderElement.firstElementChild as HTMLElement).style.display = "none";
                vditor.wysiwyg.element.blur();
                event.preventDefault();
                return true;
            }
        }

        // alt+enter: 代码块切换到语言 https://github.com/Vanessa219/vditor/issues/54
        if (!isCtrl(event) && !event.shiftKey && event.altKey && event.key === "Enter" &&
            codeRenderElement.getAttribute("data-type") === "code-block") {
            if (isCmCodeBlock(codeRenderElement)) {
                if (focusCodeBlockLanguageInput(vditor)) {
                    event.preventDefault();
                    return true;
                }
            } else {
                const inputElemment = (vditor.wysiwyg.popover.querySelector(".vditor-input") as HTMLInputElement);
                inputElemment.focus();
                inputElemment.select();
                event.preventDefault();
                return true;
            }
        }

        if (codeRenderElement.getAttribute("data-block") === "0") {
            if (hasCodeMirror(codeRenderElement) || isCmCodeBlock(codeRenderElement)) {
                return false;
            }
            if (fixCodeBlock(vditor, event, codeRenderElement.firstElementChild as HTMLElement, range)) {
                return true;
            }
            if (insertAfterBlock(vditor, event, range, codeRenderElement.firstElementChild as HTMLElement,
                codeRenderElement)) {
                return true;
            }

            if (codeRenderElement.getAttribute("data-type") !== "yaml-front-matter" &&
                insertBeforeBlock(vditor, event, range, codeRenderElement.firstElementChild as HTMLElement,
                    codeRenderElement)) {
                return true;
            }
        }
    }

    // blockquote
    if (fixBlockquote(vditor, range, event, pElement)) {
        return true;
    }

    // 顶层 blockquote
    const topBQElement = hasTopClosestByTag(startContainer, "BLOCKQUOTE");
    if (topBQElement) {
        if (!event.shiftKey && event.altKey && event.key === "Enter") {
            if (!isCtrl(event)) {
                // alt+enter: 跳出多层 blockquote 嵌套之后 https://github.com/Vanessa219/vditor/issues/51
                range.setStartAfter(topBQElement);
            } else {
                // ctrl+alt+enter: 跳出多层 blockquote 嵌套之前
                range.setStartBefore(topBQElement);
            }
            setSelectionFocus(range);
            const node = document.createElement("p");
            node.setAttribute("data-block", "0");
            node.innerHTML = "\n";
            range.insertNode(node);
            range.collapse(true);
            setSelectionFocus(range);
            afterRenderEvent(vditor);
            event.preventDefault();
            return true;
        }
    }

    // h1-h6
    const headingElement = hasClosestByHeadings(startContainer);
    if (headingElement) {
        if (!isCtrl(event) && !event.altKey && event.key === "Enter") {
            // enter/shift+enter: 标题换行时新行应为段落 https://github.com/Vanessa219/vditor/issues/48
            fixHeadingEnter(vditor, range, headingElement);
            renderToc(vditor);
            afterRenderEvent(vditor);
            event.preventDefault();
            return true;
        }

        // enter++: 标题变大
        if (matchHotKey("⌘=", event)) {
            const index = parseInt((headingElement as HTMLElement).tagName.substr(1), 10) - 1;
            if (index > 0) {
                setHeading(vditor, `h${index}`);
                afterRenderEvent(vditor);
            }
            event.preventDefault();
            return true;
        }

        // enter++: 标题变小
        if (matchHotKey("⌘-", event)) {
            const index = parseInt((headingElement as HTMLElement).tagName.substr(1), 10) + 1;
            if (index < 7) {
                setHeading(vditor, `h${index}`);
                afterRenderEvent(vditor);
            }
            event.preventDefault();
            return true;
        }

        if (event.key === "Backspace" && !isCtrl(event) && !event.shiftKey && !event.altKey
            && headingElement.textContent.length === 1) {
            // 删除后变为空
            removeHeading(vditor);
        }
    }

    // task list
    if (fixTask(vditor, range, event)) {
        return true;
    }

    // alt+enter
    if (event.altKey && event.key === "Enter" && !isCtrl(event) && !event.shiftKey) {
        // 切换到链接、链接引用、脚注引用弹出的输入框中
        const aElement = hasClosestByMatchTag(startContainer, "A");
        const linRefElement = hasClosestByAttribute(startContainer, "data-type", "link-ref");
        const footnoteRefElement = hasClosestByAttribute(startContainer, "data-type", "footnotes-ref");
        if (aElement || linRefElement || footnoteRefElement) {
            if (aElement && vditor.wysiwyg.popover.style.display !== "block") {
                genAPopover(vditor, aElement as HTMLElement);
            } else if (linRefElement && vditor.wysiwyg.popover.style.display !== "block") {
                genLinkRefPopover(vditor, linRefElement as HTMLElement);
            }
            const inputElement = vditor.wysiwyg.popover.querySelector("input");
            if (inputElement) {
                inputElement.focus();
                inputElement.select();
            }
        }
    }

    // 删除有子工具栏的块
    if (removeBlockElement(vditor, event)) {
        return true;
    }

    if (fixTab(vditor, range, event)) {
        return true;
    }

    // shift+enter：软换行，但 table/hr/heading 处理、cell 内换行、block render 换行处理单独写在上面，li & p 使用浏览器默认
    if (!isCtrl(event) && event.shiftKey && !event.altKey && event.key === "Enter" &&
        !headingElement &&
        startContainer.parentElement.tagName !== "LI" && startContainer.parentElement.tagName !== "P") {
        if (["STRONG", "STRIKE", "S", "I", "EM", "B"].includes(startContainer.parentElement.tagName)) {
            // 行内元素软换行需继续 https://github.com/Vanessa219/vditor/issues/170
            range.insertNode(document.createTextNode("\n" + Constants.ZWSP));
        } else {
            range.insertNode(document.createTextNode("\n"));
        }
        range.collapse(false);
        setSelectionFocus(range);
        afterRenderEvent(vditor);
        event.preventDefault();
        return true;
    }

    // 删除
    if (event.key === "Backspace" && !isCtrl(event) && !event.shiftKey && !event.altKey && range.toString() === "") {
        if (fixDelete(vditor, range, event, pElement)) {
            return true;
        }
        if (blockElement) {
            if (blockElement.previousElementSibling
                && blockElement.previousElementSibling.classList.contains("vditor-wysiwyg__block")
                && blockElement.previousElementSibling.getAttribute("data-block") === "0"
                // https://github.com/Vanessa219/vditor/issues/946
                && blockElement.tagName !== "UL" && blockElement.tagName !== "OL"
            ) {
                const rangeStart = getSelectPosition(blockElement, vditor.wysiwyg.element, range).start;
                if ((rangeStart === 0 && range.startOffset === 0) || // https://github.com/Vanessa219/vditor/issues/894
                    (rangeStart === 1 && blockElement.innerText.startsWith(Constants.ZWSP))) {
                    // 当前块删除后光标落于代码渲染块上，当前块会被删除，因此需要阻止事件，不能和 keyup 中的代码块处理合并
                    const prevBlock = blockElement.previousElementSibling as HTMLElement;
                    const prevPreview = prevBlock?.lastElementChild as HTMLElement;
                    if (!focusWysiwygCodeBlock(prevBlock, vditor, false) && prevPreview) {
                        showCode(prevPreview, vditor, false);
                    }
                    if (blockElement.innerHTML.trim().replace(Constants.ZWSP, "") === "") {
                        // 当前块为空且不是最后一个时，需要删除
                        blockElement.remove();
                        recordHistoryChange(vditor);
                    }
                    event.preventDefault();
                    return true;
                }
            }

            const rangeStartOffset = range.startOffset;
            if (range.toString() === "" && startContainer.nodeType === 3 &&
                startContainer.textContent.charAt(rangeStartOffset - 2) === "\n" &&
                startContainer.textContent.charAt(rangeStartOffset - 1) !== Constants.ZWSP
                && ["STRONG", "STRIKE", "S", "I", "EM", "B"].includes(startContainer.parentElement.tagName)) {
                // 保持行内元素软换行需继续的一致性
                startContainer.textContent = startContainer.textContent.substring(0, rangeStartOffset - 1) +
                    Constants.ZWSP;
                range.setStart(startContainer, rangeStartOffset);
                range.collapse(true);
                recordHistoryChange(vditor);
                event.preventDefault();
                return true;
            }

            // inline code、math、html 行前零宽字符后进行删除
            if (startContainer.textContent === Constants.ZWSP && range.startOffset === 1
                && !startContainer.previousSibling && nextIsCode(range)) {
                startContainer.textContent = "";
                // 不能返回，其前面为代码渲染块时需进行以下处理：修正光标位于 inline math/html 前，按下删除按钮 code 中内容会被删除
            }

            // 修正光标位于 inline math/html, html-entity 前，按下删除按钮 code 中内容会被删除, 不能返回，还需要进行后续处理
            blockElement.querySelectorAll("span.vditor-wysiwyg__block[data-type='math-inline']").forEach((item) => {
                (item.firstElementChild as HTMLElement).style.display = "inline";
                (item.lastElementChild as HTMLElement).style.display = "none";
            });
            blockElement.querySelectorAll("span.vditor-wysiwyg__block[data-type='html-entity']").forEach((item) => {
                (item.firstElementChild as HTMLElement).style.display = "inline";
                (item.lastElementChild as HTMLElement).style.display = "none";
            });
        }
    }

    if (isFirefox() && range.startOffset === 1 && startContainer.textContent.indexOf(Constants.ZWSP) > -1 &&
        startContainer.previousSibling && startContainer.previousSibling.nodeType !== 3 &&
        (startContainer.previousSibling as HTMLElement).tagName === "CODE" &&
        (event.key === "Backspace" || event.key === "ArrowLeft")) {
        // https://github.com/Vanessa219/vditor/issues/410
        range.selectNodeContents(startContainer.previousSibling);
        range.collapse(false);
        event.preventDefault();
        return true;
    }

    if (fixFirefoxArrowUpTable(event, blockElement, range)) {
        event.preventDefault();
        return true;
    }

    fixCursorDownInlineMath(range, event.key);

    if (event.key === "ArrowDown") {
        // 光标位于内联数学公式前，按下键无作用
        const nextElement = startContainer.nextSibling as HTMLElement;
        if (nextElement && nextElement.nodeType !== 3 && nextElement.getAttribute("data-type") === "math-inline") {
            range.setStartAfter(nextElement);
        }
    }

    if (blockElement && keydownToc(blockElement, vditor, event, range)) {
        event.preventDefault();
        return true;
    }

    return false;
};

export const removeBlockElement = (vditor: IVditor, event: KeyboardEvent) => {
    // 删除有子工具栏的块
    if (matchHotKey("⇧⌘X", event)) {
        const itemElement: HTMLElement = vditor.wysiwyg.popover.querySelector('[data-type="remove"]');
        if (itemElement) {
            itemElement.click();
            event.preventDefault();
            return true;
        }
    }
};
