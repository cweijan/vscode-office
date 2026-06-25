import {Constants} from "../constants";
import {disableToolbar} from "../toolbar/setToolbar";
import {enableToolbar} from "../toolbar/setToolbar";
import {removeCurrentToolbar} from "../toolbar/setToolbar";
import {setCurrentToolbar} from "../toolbar/setToolbar";
import {isCtrl, updateHotkeyTip} from "../util/compatibility";
import {
    hasClosestByAttribute,
    hasClosestByClassName,
    hasClosestByMatchTag,
} from "../util/hasClosest";
import {
    hasClosestByHeadings,
    hasClosestByTag,
} from "../util/hasClosestByHeadings";
import {processCodeRender} from "../util/processCode";
import {matchPreviewCodeLanguages} from "../codeBlock/codeBlockLanguageHints";
import {
    focusCodeMirror,
    isCmCodeBlock,
    isInsideCodeBlockChrome,
    isInsideCodeMirror,
    isSpecialBlock,
    CM_EDITING_CLASS,
    syncMathBlocksDisplayMode,
    shouldShowLanguagePopover,
    updateCodeMirrorLanguage,
} from "../codeBlock/codeMirrorManager";
import {showCodeBlockLanguagePopover} from "../codeBlock/codeBlockLanguagePopover";
import {
    getEditorRange,
    selectIsEditor,
    setRangeByWbr,
    setSelectionFocus,
} from "../util/selection";
import {afterRenderEvent} from "./afterRenderEvent";
import {removeBlockElement} from "./processKeydown";
import {renderToc} from "../util/toc";
import {updateActiveHeadingMarker} from "../util/updateActiveHeadingMarker";
import {showToast} from "../ui/toast";
import {codicon} from "../util/codicon";
import {updateBlockHandle} from "./blockHandle";
import {updateTableHandle} from "./tableHandle";

export const hideLinkPopover = (vditor: IVditor) => {
    clearTimeout(vditor.wysiwyg.hlToolbarTimeoutId);
    vditor.wysiwyg.popover.style.display = "none";
    delete (vditor.wysiwyg.popover as { _sourceElement?: HTMLElement })._sourceElement;
};

/** 退出链接/图片编辑弹窗，光标回到元素后（与 Alt+Enter 一致） */
export const exitLinkPopoverToElement = (vditor: IVditor, element: HTMLElement) => {
    hideLinkPopover(vditor);
    focusEditorWithoutScroll(vditor.wysiwyg.element);
    const range = getEditorRange(vditor);
    element.insertAdjacentHTML("afterend", Constants.ZWSP);
    range.setStartAfter(element.nextSibling as Node);
    range.collapse(true);
    setSelectionFocus(range);
};

const focusEditorWithoutScroll = (editor: HTMLElement) => {
    editor.focus({ preventScroll: true });
};

export const highlightToolbarWYSIWYG = (vditor: IVditor) => {
    clearTimeout(vditor.wysiwyg.hlToolbarTimeoutId);
    vditor.wysiwyg.hlToolbarTimeoutId = window.setTimeout(() => {
        let range: Range | undefined;
        try {
        if (
            vditor.wysiwyg.element.getAttribute("contenteditable") === "false"
        ) {
            return;
        }
        if (!selectIsEditor(vditor.wysiwyg.element)) {
            return;
        }
        if (isInsideCodeBlockChrome(document.activeElement)) {
            return;
        }

        removeCurrentToolbar(vditor.toolbar.elements, Constants.EDIT_TOOLBARS);
        enableToolbar(vditor.toolbar.elements, Constants.EDIT_TOOLBARS);

        range = getSelection().getRangeAt(0);
        let typeElement = range.startContainer as HTMLElement;
        if (range.startContainer.nodeType === 3) {
            typeElement = range.startContainer.parentElement;
        } else {
            typeElement = typeElement.childNodes[
                range.startOffset >= typeElement.childNodes.length
                    ? typeElement.childNodes.length - 1
                    : range.startOffset
                ] as HTMLElement;
        }

        const footnotesElement = hasClosestByAttribute(typeElement, "data-type", "footnotes-block");
        if (footnotesElement) {
            return;
        }

        // 工具栏高亮和禁用
        const liElement = hasClosestByMatchTag(typeElement, "LI");
        if (liElement) {
            if (liElement.classList.contains("vditor-task")) {
                setCurrentToolbar(vditor.toolbar.elements, ["check"]);
            } else if (liElement.parentElement.tagName === "OL") {
                setCurrentToolbar(vditor.toolbar.elements, ["ordered-list"]);
            } else if (liElement.parentElement.tagName === "UL") {
                setCurrentToolbar(vditor.toolbar.elements, ["list"]);
            }
            enableToolbar(vditor.toolbar.elements, ["outdent", "indent"]);
        } else {
            disableToolbar(vditor.toolbar.elements, ["outdent", "indent"]);
        }

        if (hasClosestByMatchTag(typeElement, "BLOCKQUOTE")) {
            setCurrentToolbar(vditor.toolbar.elements, ["quote"]);
        }

        if (
            hasClosestByMatchTag(typeElement, "B") ||
            hasClosestByMatchTag(typeElement, "STRONG")
        ) {
            setCurrentToolbar(vditor.toolbar.elements, ["bold"]);
        }

        if (
            hasClosestByMatchTag(typeElement, "I") ||
            hasClosestByMatchTag(typeElement, "EM")
        ) {
            setCurrentToolbar(vditor.toolbar.elements, ["italic"]);
        }

        if (
            hasClosestByMatchTag(typeElement, "STRIKE") ||
            hasClosestByMatchTag(typeElement, "S")
        ) {
            setCurrentToolbar(vditor.toolbar.elements, ["strike"]);
        }

        const aElement = hasClosestByMatchTag(typeElement, "A");
        if (aElement) {
            setCurrentToolbar(vditor.toolbar.elements, ["link"]);
        }
        const linkRefElement = hasClosestByAttribute(typeElement, "data-type", "link-ref");
        const isLinkPopoverVisible = vditor.wysiwyg.popover.style.display === "block" &&
            vditor.wysiwyg.popover.classList.contains("vditor-panel--link");
        if (isLinkPopoverVisible && !aElement && !linkRefElement) {
            hideLinkPopover(vditor);
        }
        const tableElement = hasClosestByMatchTag(typeElement, "TABLE") as HTMLTableElement;
        const headingElement = hasClosestByHeadings(typeElement) as HTMLElement;
        if (hasClosestByMatchTag(typeElement, "CODE")) {
            if (hasClosestByMatchTag(typeElement, "PRE")) {
                disableToolbar(vditor.toolbar.elements, [
                    "headings",
                    "bold",
                    "italic",
                    "strike",
                    "line",
                    "quote",
                    "list",
                    "ordered-list",
                    "check",
                    "code",
                    "inline-code",
                    "upload",
                    "link",
                    "table",
                ]);
                setCurrentToolbar(vditor.toolbar.elements, ["code"]);
            } else {
                disableToolbar(vditor.toolbar.elements, [
                    "headings",
                    "bold",
                    "italic",
                    "strike",
                    "line",
                    "quote",
                    "list",
                    "ordered-list",
                    "check",
                    "code",
                    "upload",
                    "link",
                    "table",
                ]);
                setCurrentToolbar(vditor.toolbar.elements, ["inline-code"]);
            }
        } else if (headingElement) {
            disableToolbar(vditor.toolbar.elements, ["bold"]);
            setCurrentToolbar(vditor.toolbar.elements, ["headings"]);
        } else if (tableElement) {
            disableToolbar(vditor.toolbar.elements, ["table"]);
            if (!aElement && !linkRefElement) {
                vditor.wysiwyg.popover.style.display = "none";
            }
        }

        // quote popover
        const blockquoteElement = hasClosestByTag(typeElement, "BLOCKQUOTE") as HTMLTableElement;

        // footnote popover
        const footnotesRefElement = hasClosestByAttribute(typeElement, "data-type", "footnotes-ref");
        if (footnotesRefElement) {
            const lang: keyof II18n | "" = vditor.options.lang;
            const options: IOptions = vditor.options;
            vditor.wysiwyg.popover.innerHTML = "";

            const inputWrap = document.createElement("span");
            inputWrap.setAttribute("aria-label", window.VditorI18n.footnoteRef + "<" + updateHotkeyTip("⌥Enter") + ">");
            inputWrap.className = "vditor-tooltipped vditor-tooltipped__n";
            const input = document.createElement("input");
            inputWrap.appendChild(input);
            input.className = "vditor-input";
            input.setAttribute("placeholder", window.VditorI18n.footnoteRef + "<" + updateHotkeyTip("⌥Enter") + ">");
            input.style.width = "120px";
            input.value = footnotesRefElement.getAttribute("data-footnotes-label");
            input.oninput = () => {
                if (input.value.trim() !== "") {
                    footnotesRefElement.setAttribute("data-footnotes-label", input.value);
                }
            };
            input.onkeydown = (event) => {
                if (event.isComposing) {
                    return;
                }
                if (
                    !isCtrl(event) &&
                    !event.shiftKey &&
                    event.altKey &&
                    event.key === "Enter"
                ) {
                    range.selectNodeContents(footnotesRefElement);
                    range.collapse(false);
                    setSelectionFocus(range);
                    event.preventDefault();
                    return;
                }
                removeBlockElement(vditor, event);
            };

            vditor.wysiwyg.popover.insertAdjacentElement("beforeend", inputWrap);
            setPopoverPosition(vditor, footnotesRefElement);
        }

        // block popover: math-inline, math-block, html-block, html-inline, code-block, html-entity
        let blockRenderElement: HTMLElement | false = hasClosestByClassName(typeElement, "vditor-wysiwyg__block");
        if (!blockRenderElement && isInsideCodeMirror(typeElement)) {
            blockRenderElement = (hasClosestByAttribute(typeElement, "data-type", "code-block")
                || hasClosestByAttribute(typeElement, "data-type", "math-block")) as HTMLElement;
        }
        const blockType = blockRenderElement !== false ? (blockRenderElement.getAttribute("data-type") ?? "") : "";
        const isBlock = blockType.endsWith("-block");
        syncMathBlocksDisplayMode(vditor.wysiwyg.element, vditor);
        vditor.wysiwyg.element
            .querySelectorAll(".vditor-wysiwyg__preview")
            .forEach((itemElement) => {
                const block = itemElement.closest(
                    "[data-type='code-block'], [data-type='math-block']",
                ) as HTMLElement;
                const previousElement = itemElement.previousElementSibling as HTMLElement;
                if (!block || !previousElement) {
                    return;
                }
                if (isSpecialBlock(block)) {
                    if (block.classList.contains(CM_EDITING_CLASS)) {
                        return;
                    }
                    previousElement.style.display = "none";
                    return;
                }
                if (isCmCodeBlock(block)) {
                    return;
                }
                if (!blockRenderElement || (blockRenderElement !== false && isBlock && !blockRenderElement.contains(itemElement))) {
                    previousElement.style.display = "none";
                }
            });
        if (blockRenderElement !== false && isBlock) {
            if (blockRenderElement.getAttribute("data-type") === "code-block" &&
                shouldShowLanguagePopover(blockRenderElement) &&
                !isCmCodeBlock(blockRenderElement)) {
                showCodeBlockLanguagePopover(vditor, blockRenderElement);
            } else if (blockRenderElement.getAttribute("data-type") === "code-block" &&
                !isCmCodeBlock(blockRenderElement)) {
                vditor.wysiwyg.popover.innerHTML = "";
                    const languageWrap = document.createElement("span");
                languageWrap.setAttribute("aria-label", window.VditorI18n.language + "<" + updateHotkeyTip("⌥Enter") + ">");
                languageWrap.className = "vditor-tooltipped vditor-tooltipped__n";
                const language = document.createElement("input");
                languageWrap.appendChild(language);

                const codeElement = blockRenderElement.querySelector("pre code") as HTMLElement;

                language.className = "vditor-input";
                language.setAttribute("placeholder", window.VditorI18n.language);
                language.value =
                    codeElement.className.indexOf("language-") > -1
                        ? codeElement.className.split("-")[1].split(" ")[0]
                        : "";
                language.oninput = (e: InputEvent) => {
                    const lang = language.value.trim();
                    if (lang !== "") {
                        codeElement.className = `language-${lang}`;
                        vditor.hint.recentLanguage = lang;
                    } else {
                        codeElement.className = "";
                        vditor.hint.recentLanguage = "";
                    }
                    if (!isCmCodeBlock(blockRenderElement) &&
                        blockRenderElement.lastElementChild.classList.contains("vditor-wysiwyg__preview")) {
                        blockRenderElement.lastElementChild.innerHTML =
                            blockRenderElement.firstElementChild.innerHTML;
                        processCodeRender(blockRenderElement.lastElementChild as HTMLElement, vditor);
                    }
                    updateCodeMirrorLanguage(blockRenderElement, language.value.trim());
                    afterRenderEvent(vditor);
                    if (e.detail === 1 && isCmCodeBlock(blockRenderElement)) {
                        focusCodeMirror(blockRenderElement, true, vditor);
                    }
                };
                language.onkeydown = (event: KeyboardEvent) => {
                    if (event.isComposing) {
                        return;
                    }
                    if (removeBlockElement(vditor, event)) {
                        return;
                    }
                    if (
                        event.key === "Escape" &&
                        vditor.hint.element.style.display === "block"
                    ) {
                        vditor.hint.element.style.display = "none";
                        event.preventDefault();
                        return;
                    }
                    vditor.hint.select(event, vditor);
                    if (
                        !isCtrl(event) &&
                        !event.shiftKey &&
                        event.key === "Enter"
                    ) {
                        if (isCmCodeBlock(blockRenderElement)) {
                            focusCodeMirror(blockRenderElement, false, vditor);
                        } else {
                            range.setStart(codeElement.firstChild, 0);
                            range.collapse(true);
                            setSelectionFocus(range);
                        }
                        event.preventDefault();
                        event.stopPropagation();
                    }
                };
                language.onkeyup = (event: KeyboardEvent) => {
                    if (
                        event.isComposing ||
                        event.key === "Enter" ||
                        event.key === "ArrowUp" ||
                        event.key === "Escape" ||
                        event.key === "ArrowDown"
                    ) {
                        return;
                    }
                    const key = language.value.substring(0, language.selectionStart);
                    vditor.hint.genHTML(matchPreviewCodeLanguages(key), key, vditor);
                    event.preventDefault();
                };
                vditor.wysiwyg.popover.insertAdjacentElement("beforeend", languageWrap);
                setPopoverPosition(vditor, blockRenderElement);
            }
        } else {
            blockRenderElement = false;
        }
        if (headingElement) {
            vditor.wysiwyg.popover.style.display = "none";
        }

        const tocElement = hasClosestByClassName(typeElement, "vditor-toc") as HTMLElement;

        if (
            !blockquoteElement &&
            !liElement &&
            !tableElement &&
            !blockRenderElement &&
            !aElement &&
            !linkRefElement &&
            !footnotesRefElement &&
            !headingElement &&
            !tocElement
        ) {
            const cmBlock = hasClosestByAttribute(typeElement, "data-type", "code-block") as HTMLElement;
            if (!(cmBlock && shouldShowLanguagePopover(cmBlock))) {
                vditor.wysiwyg.popover.style.display = "none";
            }
        }

        // 反斜杠特殊处理
        vditor.wysiwyg.element
            .querySelectorAll('span[data-type="backslash"] > span')
            .forEach((item: HTMLElement) => {
                item.style.display = "none";
            });
        const backslashElement = hasClosestByAttribute(range.startContainer, "data-type", "backslash");
        if (backslashElement) {
            backslashElement.querySelector("span").style.display = "inline";
        }

        const activeCmBlock = hasClosestByAttribute(typeElement, "data-type", "code-block") as HTMLElement;
        if (activeCmBlock && shouldShowLanguagePopover(activeCmBlock) && !isCmCodeBlock(activeCmBlock)) {
            showCodeBlockLanguagePopover(vditor, activeCmBlock);
        }
        } finally {
            updateActiveHeadingMarker(vditor);
            updateBlockHandle(vditor, range?.startContainer);
            updateTableHandle(vditor);
        }
    }, 200);
};

const setPopoverPosition = (vditor: IVditor, element: HTMLElement, popoverType?: "link" | "link-ref" | "image") => {
    const isLinkPanel = popoverType === "link" || popoverType === "link-ref" || popoverType === "image";
    vditor.wysiwyg.popover.classList.toggle("vditor-panel--link", isLinkPanel);
    vditor.wysiwyg.popover.classList.toggle("vditor-panel--link-ref", popoverType === "link-ref");
    vditor.wysiwyg.popover.classList.toggle("vditor-panel--image", popoverType === "image");
    vditor.wysiwyg.popover.style.left = "0";
    vditor.wysiwyg.popover.style.display = "block";

    const elementRect = element.getClientRects()[0] || element.getBoundingClientRect();
    const editorRect = vditor.wysiwyg.element.getBoundingClientRect();
    const anchorTop = elementRect.top - editorRect.top + vditor.wysiwyg.element.scrollTop;
    const anchorLeft = elementRect.left - editorRect.left + vditor.wysiwyg.element.scrollLeft;
    const popoverTop = anchorTop - (isLinkPanel ? vditor.wysiwyg.popover.clientHeight + 8 : 21);
    const maxLeft = vditor.wysiwyg.element.clientWidth - vditor.wysiwyg.popover.clientWidth;

    vditor.wysiwyg.popover.style.top =
        Math.max(-8, popoverTop - vditor.wysiwyg.element.scrollTop) + "px";
    vditor.wysiwyg.popover.style.left =
        Math.max(0, Math.min(anchorLeft - vditor.wysiwyg.element.scrollLeft, maxLeft)) + "px";
    vditor.wysiwyg.popover.setAttribute("data-top", popoverTop.toString());
};

export const genLinkRefPopover = (vditor: IVditor, linkRefElement: HTMLElement) => {
    (vditor.wysiwyg.popover as any)._sourceElement = linkRefElement;
    vditor.wysiwyg.popover.innerHTML = "";

    const getDisplayText = () => {
        if (linkRefElement.tagName === "IMG") {
            return linkRefElement.getAttribute("alt") || "";
        }
        return linkRefElement.textContent || "";
    };

    const setDisplayText = (value: string) => {
        if (linkRefElement.tagName === "IMG") {
            linkRefElement.setAttribute("alt", value);
            return;
        }
        linkRefElement.textContent = value;
    };

    const updateText = () => {
        if (textInput.value.trim() !== "") {
            setDisplayText(textInput.value);
        }
        afterRenderEvent(vditor);
    };

    const updateRef = () => {
        linkRefElement.setAttribute("data-link-label", refInput.value);
        afterRenderEvent(vditor);
    };

    const copyRef = async (): Promise<boolean> => {
        const text = textInput.value;
        if (navigator.clipboard?.writeText) {
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch {
                return false;
            }
        }
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand("copy");
        textarea.remove();
        return copied;
    };

    const removeLinkRef = () => {
        const range = getEditorRange(vditor);
        const childNodes = Array.from(linkRefElement.childNodes);
        let focusNode: Node = linkRefElement;
        if (linkRefElement.tagName === "IMG") {
            focusNode = document.createTextNode(linkRefElement.getAttribute("alt") || "");
            linkRefElement.parentElement?.insertBefore(focusNode, linkRefElement);
        } else if (childNodes.length > 0) {
            for (const node of childNodes) {
                focusNode = node;
                linkRefElement.parentElement?.insertBefore(node, linkRefElement);
            }
        } else {
            focusNode = document.createTextNode(linkRefElement.textContent || "");
            linkRefElement.parentElement?.insertBefore(focusNode, linkRefElement);
        }
        linkRefElement.remove();
        range.setStartAfter(focusNode);
        range.collapse(true);
        setSelectionFocus(range);
        clearTimeout(vditor.wysiwyg.afterRenderTimeoutId);
        vditor.undo.addToUndoStack(vditor);
        afterRenderEvent(vditor, {
            enableAddUndoStack: false,
            enableHint: false,
            enableInput: true,
        });
        highlightToolbarWYSIWYG(vditor);
    };

    const view = document.createElement("span");
    view.className = "vditor-link-popover";

    const textInput = document.createElement("input");
    textInput.className = "vditor-link-popover__text vditor-input";
    textInput.setAttribute("placeholder", window.VditorI18n.textIsNotEmpty);
    textInput.value = getDisplayText();
    textInput.oninput = () => {
        updateText();
    };
    textInput.onkeydown = (event) => {
        if (removeBlockElement(vditor, event)) {
            return;
        }
        linkHotkey(vditor, linkRefElement, event, refInput);
    };

    const refInput = document.createElement("input");
    refInput.className = "vditor-link-popover__text vditor-input";
    refInput.setAttribute("placeholder", window.VditorI18n.linkRef);
    refInput.value = linkRefElement.getAttribute("data-link-label") || "";
    refInput.oninput = () => {
        updateRef();
    };
    refInput.onkeydown = (event) => {
        if (removeBlockElement(vditor, event)) {
            return;
        }
        linkHotkey(vditor, linkRefElement, event, textInput);
    };

    const copy = document.createElement("button");
    copy.setAttribute("type", "button");
    copy.setAttribute("aria-label", window.VditorI18n.copy);
    copy.className = "vditor-link-popover__button vditor-link-popover__button--copy";
    copy.innerHTML = `<span class="vditor-link-popover__button-icon">${codicon("copy")}</span>`;
    copy.onclick = async () => {
        if (await copyRef()) {
            showToast(vditor, window.VditorI18n.linkRefCopied || window.VditorI18n.copied);
        }
    };

    const remove = document.createElement("button");
    remove.setAttribute("type", "button");
    remove.setAttribute("aria-label", window.VditorI18n.remove);
    remove.className = "vditor-link-popover__button vditor-link-popover__button--remove";
    remove.innerHTML = `<span class="vditor-link-popover__button-icon">${codicon("trash")}</span>`;
    remove.onclick = removeLinkRef;

    view.append(textInput, refInput, copy, remove);
    vditor.wysiwyg.popover.insertAdjacentElement("beforeend", view);
    setPopoverPosition(vditor, linkRefElement, "link-ref");
};

const linkHotkey = (
    vditor: IVditor,
    element: HTMLElement,
    event: KeyboardEvent,
    nextInputElement: HTMLInputElement,
) => {
    if (event.isComposing) {
        return;
    }
    if (event.key === "Escape") {
        exitLinkPopoverToElement(vditor, element);
        event.preventDefault();
        event.stopPropagation();
        return;
    }
    if (event.key === "Tab") {
        nextInputElement.focus();
        nextInputElement.select();
        event.preventDefault();
        return;
    }
    if (
        !isCtrl(event) &&
        !event.shiftKey &&
        event.altKey &&
        event.key === "Enter"
    ) {
        exitLinkPopoverToElement(vditor, element);
        event.preventDefault();
    }
};

export const genAPopover = (vditor: IVditor, aElement: HTMLElement) => {
    (vditor.wysiwyg.popover as { _sourceElement?: HTMLElement })._sourceElement = aElement;
    vditor.wysiwyg.popover.innerHTML = "";

    const updateText = () => {
        if (textInput.value.trim() !== "") {
            aElement.innerHTML = textInput.value;
        }
        afterRenderEvent(vditor);
    };

    const updateHref = () => {
        aElement.setAttribute("href", hrefInput.value);
        afterRenderEvent(vditor);
    };

    aElement.querySelectorAll("[data-marker]").forEach((item: HTMLElement) => {
        item.removeAttribute("data-marker");
    });

    const copyLink = async (): Promise<boolean> => {
        const link = aElement.getAttribute("href") || "";
        if (navigator.clipboard?.writeText) {
            try {
                await navigator.clipboard.writeText(link);
                return true;
            } catch {
                return false;
            }
        }
        const textarea = document.createElement("textarea");
        textarea.value = link;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand("copy");
        textarea.remove();
        return copied;
    };

    const unlinkA = () => {
        const range = getEditorRange(vditor);
        const childNodes = Array.from(aElement.childNodes);
        let focusNode: Node = aElement;
        if (childNodes.length > 0) {
            for (const node of childNodes) {
                focusNode = node;
                aElement.parentElement.insertBefore(node, aElement);
            }
        } else {
            focusNode = document.createTextNode(aElement.getAttribute("href") || "");
            aElement.parentElement.insertBefore(focusNode, aElement);
        }
        aElement.remove();
        range.setStartAfter(focusNode);
        range.collapse(true);
        setSelectionFocus(range);
        clearTimeout(vditor.wysiwyg.afterRenderTimeoutId);
        vditor.undo.addToUndoStack(vditor);
        afterRenderEvent(vditor, {
            enableAddUndoStack: false,
            enableHint: false,
            enableInput: true,
        });
        highlightToolbarWYSIWYG(vditor);
    };

    const view = document.createElement("span");
    view.className = "vditor-link-popover";

    const textInput = document.createElement("input");
    textInput.className = "vditor-link-popover__text vditor-input";
    textInput.setAttribute("placeholder", window.VditorI18n.textIsNotEmpty);
    textInput.value = aElement.innerHTML || "";
    textInput.oninput = () => {
        updateText();
    };
    textInput.onkeydown = (event) => {
        if (removeBlockElement(vditor, event)) {
            return;
        }
        linkHotkey(vditor, aElement, event, hrefInput);
    };

    const hrefInput = document.createElement("input");
    hrefInput.className = "vditor-link-popover__href vditor-input";
    hrefInput.setAttribute("placeholder", window.VditorI18n.link);
    hrefInput.value = aElement.getAttribute("href") || "";
    hrefInput.oninput = () => {
        updateHref();
    };
    hrefInput.onkeydown = (event) => {
        if (removeBlockElement(vditor, event)) {
            return;
        }
        linkHotkey(vditor, aElement, event, textInput);
    };

    const copy = document.createElement("button");
    copy.setAttribute("type", "button");
    copy.setAttribute("aria-label", window.VditorI18n.copy);
    copy.className = "vditor-link-popover__button vditor-link-popover__button--copy";
    copy.innerHTML = `<span class="vditor-link-popover__button-icon">${codicon("copy")}</span>`;
    copy.onclick = async () => {
        if (await copyLink()) {
            showToast(vditor, window.VditorI18n.linkCopied || window.VditorI18n.copied);
        }
    };

    const remove = document.createElement("button");
    remove.setAttribute("type", "button");
    remove.setAttribute("aria-label", window.VditorI18n.remove);
    remove.className = "vditor-link-popover__button vditor-link-popover__button--remove";
    remove.innerHTML = `<span class="vditor-link-popover__button-icon">${codicon("trash")}</span>`;
    remove.onclick = unlinkA;

    const hint = document.createElement("span");
    hint.className = "vditor-link-popover__hint";
    hint.textContent = updateHotkeyTip("⌥Enter");

    view.append(textInput, hrefInput, copy, remove, hint);
    vditor.wysiwyg.popover.insertAdjacentElement("beforeend", view);
    setPopoverPosition(vditor, aElement, "link");
};

export const genImagePopover = (event: Event, vditor: IVditor) => {
    const imgElement = event.target as HTMLImageElement;
    (vditor.wysiwyg.popover as any)._sourceElement = imgElement;
    vditor.wysiwyg.popover.innerHTML = "";

    const updateAlt = () => {
        imgElement.setAttribute("alt", altInput.value);
        afterRenderEvent(vditor);
    };

    const updateSrc = () => {
        imgElement.setAttribute("src", srcInput.value);
        afterRenderEvent(vditor);
    };

    const copySrc = async (): Promise<boolean> => {
        const src = srcInput.value;
        if (navigator.clipboard?.writeText) {
            try {
                await navigator.clipboard.writeText(src);
                return true;
            } catch {
                return false;
            }
        }
        const textarea = document.createElement("textarea");
        textarea.value = src;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand("copy");
        textarea.remove();
        return copied;
    };

    const removeImage = () => {
        const range = getEditorRange(vditor);
        range.setStartBefore(imgElement);
        range.collapse(true);
        imgElement.remove();
        setSelectionFocus(range);
        clearTimeout(vditor.wysiwyg.afterRenderTimeoutId);
        vditor.undo.addToUndoStack(vditor);
        afterRenderEvent(vditor, {
            enableAddUndoStack: false,
            enableHint: false,
            enableInput: true,
        });
        highlightToolbarWYSIWYG(vditor);
    };

    const view = document.createElement("span");
    view.className = "vditor-link-popover";

    const altInput = document.createElement("input");
    altInput.className = "vditor-link-popover__text vditor-input";
    altInput.setAttribute("placeholder", window.VditorI18n.alternateText);
    altInput.value = imgElement.getAttribute("alt") || "";
    altInput.oninput = () => {
        updateAlt();
    };
    altInput.onkeydown = (elementEvent) => {
        if (removeBlockElement(vditor, elementEvent)) {
            return;
        }
        linkHotkey(vditor, imgElement, elementEvent, srcInput);
    };

    const srcInput = document.createElement("input");
    srcInput.className = "vditor-link-popover__href vditor-input";
    srcInput.setAttribute("placeholder", window.VditorI18n.imageURL);
    srcInput.value = imgElement.getAttribute("src") || "";
    srcInput.oninput = () => {
        updateSrc();
    };
    srcInput.onkeydown = (elementEvent) => {
        if (removeBlockElement(vditor, elementEvent)) {
            return;
        }
        linkHotkey(vditor, imgElement, elementEvent, altInput);
    };

    const copy = document.createElement("button");
    copy.setAttribute("type", "button");
    copy.setAttribute("aria-label", window.VditorI18n.copy);
    copy.className = "vditor-link-popover__button vditor-link-popover__button--copy";
    copy.innerHTML = `<span class="vditor-link-popover__button-icon">${codicon("copy")}</span>`;
    copy.onclick = async () => {
        if (await copySrc()) {
            showToast(vditor, window.VditorI18n.linkCopied || window.VditorI18n.copied);
        }
    };

    const remove = document.createElement("button");
    remove.setAttribute("type", "button");
    remove.setAttribute("aria-label", window.VditorI18n.remove);
    remove.className = "vditor-link-popover__button vditor-link-popover__button--remove";
    remove.innerHTML = `<span class="vditor-link-popover__button-icon">${codicon("trash")}</span>`;
    remove.onclick = removeImage;

    view.append(altInput, srcInput, copy, remove);
    vditor.wysiwyg.popover.insertAdjacentElement("beforeend", view);
    setPopoverPosition(vditor, imgElement, "image");
};


const tryGetElement = (range: Range): HTMLElement => {
    const typeElement = range.startContainer as HTMLElement;

    return hasClosestByTag(typeElement, "BLOCKQUOTE") as HTMLTableElement
        || hasClosestByMatchTag(typeElement, "LI") as HTMLBaseElement
        ||hasClosestByMatchTag(typeElement, "TABLE") as HTMLTableElement
        || hasClosestByClassName(typeElement, "vditor-wysiwyg__block") as HTMLElement
        || hasClosestByHeadings(typeElement) as HTMLElement
        ||  hasClosestByAttribute(typeElement, "data-block", "0") as HTMLElement
        ;
};

const isSkippableEmptyParagraph = (element: HTMLElement | null) => {
    return !!element
        && element.tagName === "P"
        && element.getAttribute("data-block") === "0"
        && element.textContent.trim().replace(Constants.ZWSP, "") === "";
};

const skipEmptyParagraphs = (element: HTMLElement | null, direction: "up" | "down"): HTMLElement | null => {
    let current = element;
    while (current && isSkippableEmptyParagraph(current)) {
        current = (direction === "up"
            ? current.previousElementSibling
            : current.nextElementSibling) as HTMLElement | null;
    }
    return current;
};

const cleanupEmptyList = (list: HTMLElement | null) => {
    if (!list || (list.tagName !== "UL" && list.tagName !== "OL") || list.childElementCount > 0) {
        return;
    }
    const emptyAfter = list.nextElementSibling as HTMLElement | null;
    const emptyBefore = list.previousElementSibling as HTMLElement | null;
    list.remove();
    if (emptyAfter && isSkippableEmptyParagraph(emptyAfter)) {
        emptyAfter.remove();
    }
    if (emptyBefore && isSkippableEmptyParagraph(emptyBefore)) {
        emptyBefore.remove();
    }
};

const moveListItem = (li: HTMLElement, direction: "up" | "down") => {
    const inlineSibling = (direction === "up"
        ? li.previousElementSibling
        : li.nextElementSibling) as HTMLElement | null;
    if (inlineSibling?.tagName === "LI") {
        if (direction === "up") {
            inlineSibling.insertAdjacentElement("beforebegin", li);
        } else {
            inlineSibling.insertAdjacentElement("afterend", li);
        }
        return true;
    }

    const sourceList = li.parentElement as HTMLElement | null;
    if (!sourceList || (sourceList.tagName !== "UL" && sourceList.tagName !== "OL")) {
        return false;
    }

    const adjacentList = skipEmptyParagraphs(
        (direction === "up"
            ? sourceList.previousElementSibling
            : sourceList.nextElementSibling) as HTMLElement | null,
        direction,
    );
    if (!adjacentList || (adjacentList.tagName !== "UL" && adjacentList.tagName !== "OL")) {
        return false;
    }

    if (direction === "up") {
        adjacentList.appendChild(li);
    } else {
        adjacentList.insertBefore(li, adjacentList.firstChild);
    }
    cleanupEmptyList(sourceList);
    return true;
};

const moveBlockSibling = (element: HTMLElement, direction: "up" | "down", editorElement: HTMLElement) => {
    let sibling = (direction === "up"
        ? element.previousElementSibling
        : element.nextElementSibling) as HTMLElement | null;
    sibling = skipEmptyParagraphs(sibling, direction);
    if (!sibling) {
        return false;
    }
    if (!element.parentElement?.isEqualNode(editorElement) && element.tagName !== "LI") {
        return false;
    }
    if (direction === "up") {
        sibling.insertAdjacentElement("beforebegin", element);
    } else {
        sibling.insertAdjacentElement("afterend", element);
    }
    return true;
};

const performBlockMove = (range: Range, vditor: IVditor, direction: "up" | "down") => {
    const element = tryGetElement(range);
    if (!element) {
        return;
    }
    const wbr = document.createElement("wbr");
    range.insertNode(wbr);
    const moved = element.tagName === "LI"
        ? moveListItem(element, direction)
        : moveBlockSibling(element, direction, vditor.wysiwyg.element);
    if (!moved) {
        wbr.remove();
        return;
    }
    setRangeByWbr(vditor.wysiwyg.element, range);
    afterRenderEvent(vditor);
    highlightToolbarWYSIWYG(vditor);
};

export function moveDown(range: Range, vditor: IVditor) {
    performBlockMove(range, vditor, "down");
}

export function moveUp(range: Range, vditor: IVditor) {
    performBlockMove(range, vditor, "up");
}
