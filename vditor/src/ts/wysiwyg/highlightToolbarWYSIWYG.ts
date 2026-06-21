import {Constants} from "../constants";
import {disableToolbar} from "../toolbar/setToolbar";
import {enableToolbar} from "../toolbar/setToolbar";
import {removeCurrentToolbar} from "../toolbar/setToolbar";
import {setCurrentToolbar} from "../toolbar/setToolbar";
import {isCtrl, updateHotkeyTip} from "../util/compatibility";
import {
    deleteColumn,
    deleteRow,
    insertColumn,
    insertRow,
    insertRowAbove,
    setTableAlign,
} from "../util/fixBrowserBehavior";
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

export const highlightToolbarWYSIWYG = (vditor: IVditor) => {
    clearTimeout(vditor.wysiwyg.hlToolbarTimeoutId);
    vditor.wysiwyg.hlToolbarTimeoutId = window.setTimeout(() => {
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

        const range = getSelection().getRangeAt(0);
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
        }

        // quote popover
        const blockquoteElement = hasClosestByTag(typeElement, "BLOCKQUOTE") as HTMLTableElement;

        // table popover
        if (tableElement) {
            const lang: keyof II18n | "" = vditor.options.lang;
            const options: IOptions = vditor.options;
            vditor.wysiwyg.popover.innerHTML = "";
            const updateTable = () => {
                const oldRow = tableElement.rows.length;
                const oldColumn = tableElement.rows[0].cells.length;
                const row = parseInt(input.value, 10) || oldRow;
                const column = parseInt(input2.value, 10) || oldColumn;

                if (row === oldRow && oldColumn === column) {
                    return;
                }

                if (oldColumn !== column) {
                    const columnDiff = column - oldColumn;
                    for (let i = 0; i < tableElement.rows.length; i++) {
                        if (columnDiff > 0) {
                            for (let j = 0; j < columnDiff; j++) {
                                if (i === 0) {
                                    tableElement.rows[i].lastElementChild.insertAdjacentHTML("afterend", "<th> </th>");
                                } else {
                                    tableElement.rows[i].lastElementChild.insertAdjacentHTML("afterend", "<td> </td>");
                                }
                            }
                        } else {
                            for (let k = oldColumn - 1; k >= column; k--) {
                                tableElement.rows[i].cells[k].remove();
                            }
                        }
                    }
                }

                if (oldRow !== row) {
                    const rowDiff = row - oldRow;
                    if (rowDiff > 0) {
                        let rowHTML = "<tr>";
                        for (let m = 0; m < column; m++) {
                            rowHTML += "<td> </td>";
                        }
                        for (let l = 0; l < rowDiff; l++) {
                            if (tableElement.querySelector("tbody")) {
                                tableElement
                                    .querySelector("tbody")
                                    .insertAdjacentHTML("beforeend", rowHTML);
                            } else {
                                tableElement
                                    .querySelector("thead")
                                    .insertAdjacentHTML("afterend", rowHTML + "</tr>");
                            }
                        }
                    } else {
                        for (let m = oldRow - 1; m >= row; m--) {
                            tableElement.rows[m].remove();
                            if (tableElement.rows.length === 1) {
                                tableElement.querySelector("tbody").remove();
                            }
                        }
                    }
                }
            };

            const setAlign = (type: string) => {
                setTableAlign(tableElement, type);
                if (type === "right") {
                    left.classList.remove("vditor-icon--current");
                    center.classList.remove("vditor-icon--current");
                    right.classList.add("vditor-icon--current");
                } else if (type === "center") {
                    left.classList.remove("vditor-icon--current");
                    right.classList.remove("vditor-icon--current");
                    center.classList.add("vditor-icon--current");
                } else {
                    center.classList.remove("vditor-icon--current");
                    right.classList.remove("vditor-icon--current");
                    left.classList.add("vditor-icon--current");
                }
                setSelectionFocus(range);
                afterRenderEvent(vditor);
            };

            const td = hasClosestByMatchTag(typeElement, "TD");
            const th = hasClosestByMatchTag(typeElement, "TH");
            let alignType = "left";
            if (td) {
                alignType = td.getAttribute("align") || "left";
            } else if (th) {
                alignType = th.getAttribute("align") || "center";
            }

            const left = document.createElement("button");
            left.setAttribute("type", "button");
            left.setAttribute("aria-label", window.VditorI18n.alignLeft + "<" + updateHotkeyTip("⇧⌘L") + ">");
            left.setAttribute("data-type", "left");
            left.innerHTML =
                '<svg><use xlink:href="#vditor-icon-align-left"></use></svg>';
            left.className =
                "vditor-icon vditor-tooltipped vditor-tooltipped__n" +
                (alignType === "left" ? " vditor-icon--current" : "");
            left.onclick = () => {
                setAlign("left");
            };

            const center = document.createElement("button");
            center.setAttribute("type", "button");
            center.setAttribute("aria-label", window.VditorI18n.alignCenter + "<" + updateHotkeyTip("⇧⌘C") + ">");
            center.setAttribute("data-type", "center");
            center.innerHTML =
                '<svg><use xlink:href="#vditor-icon-align-center"></use></svg>';
            center.className =
                "vditor-icon vditor-tooltipped vditor-tooltipped__n" +
                (alignType === "center" ? " vditor-icon--current" : "");
            center.onclick = () => {
                setAlign("center");
            };

            const right = document.createElement("button");
            right.setAttribute("type", "button");
            right.setAttribute("aria-label", window.VditorI18n.alignRight + "<" + updateHotkeyTip("⇧⌘R") + ">");
            right.setAttribute("data-type", "right");
            right.innerHTML =
                '<svg><use xlink:href="#vditor-icon-align-right"></use></svg>';
            right.className =
                "vditor-icon vditor-tooltipped vditor-tooltipped__n" +
                (alignType === "right" ? " vditor-icon--current" : "");
            right.onclick = () => {
                setAlign("right");
            };

            const insertRowElement = document.createElement("button");
            insertRowElement.setAttribute("type", "button");
            insertRowElement.setAttribute("aria-label", window.VditorI18n.insertRowBelow + "<" + updateHotkeyTip("⌘=") + ">");
            insertRowElement.setAttribute("data-type", "insertRow");
            insertRowElement.innerHTML =
                '<svg><use xlink:href="#vditor-icon-insert-row"></use></svg>';
            insertRowElement.className =
                "vditor-icon vditor-tooltipped vditor-tooltipped__n";
            insertRowElement.onclick = () => {
                const startContainer = getSelection().getRangeAt(0)
                    .startContainer;
                const cellElement =
                    hasClosestByMatchTag(startContainer, "TD") ||
                    hasClosestByMatchTag(startContainer, "TH");
                if (cellElement) {
                    insertRow(vditor, range, cellElement);
                }
            };

            const insertRowBElement = document.createElement("button");
            insertRowBElement.setAttribute("type", "button");
            insertRowBElement.setAttribute("aria-label",
                window.VditorI18n.insertRowAbove + "<" + updateHotkeyTip("⇧⌘F") + ">");
            insertRowBElement.setAttribute("data-type", "insertRow");
            insertRowBElement.innerHTML =
                '<svg><use xlink:href="#vditor-icon-insert-rowb"></use></svg>';
            insertRowBElement.className =
                "vditor-icon vditor-tooltipped vditor-tooltipped__n";
            insertRowBElement.onclick = () => {
                const startContainer = getSelection().getRangeAt(0)
                    .startContainer;
                const cellElement =
                    hasClosestByMatchTag(startContainer, "TD") ||
                    hasClosestByMatchTag(startContainer, "TH");
                if (cellElement) {
                    insertRowAbove(vditor, range, cellElement);
                }
            };

            const insertColumnElement = document.createElement("button");
            insertColumnElement.setAttribute("type", "button");
            insertColumnElement.setAttribute("aria-label", window.VditorI18n.insertColumnRight + "<" + updateHotkeyTip("⇧⌘=") + ">");
            insertColumnElement.setAttribute("data-type", "insertColumn");
            insertColumnElement.innerHTML =
                '<svg><use xlink:href="#vditor-icon-insert-column"></use></svg>';
            insertColumnElement.className =
                "vditor-icon vditor-tooltipped vditor-tooltipped__n";
            insertColumnElement.onclick = () => {
                const startContainer = getSelection().getRangeAt(0)
                    .startContainer;
                const cellElement =
                    hasClosestByMatchTag(startContainer, "TD") ||
                    hasClosestByMatchTag(startContainer, "TH");
                if (cellElement) {
                    insertColumn(vditor, tableElement, cellElement);
                }
            };

            const insertColumnBElement = document.createElement("button");
            insertColumnBElement.setAttribute("type", "button");
            insertColumnBElement.setAttribute("aria-label", window.VditorI18n.insertColumnLeft + "<" + updateHotkeyTip("⇧⌘G") + ">");
            insertColumnBElement.setAttribute("data-type", "insertColumn");
            insertColumnBElement.innerHTML =
                '<svg><use xlink:href="#vditor-icon-insert-columnb"></use></svg>';
            insertColumnBElement.className =
                "vditor-icon vditor-tooltipped vditor-tooltipped__n";
            insertColumnBElement.onclick = () => {
                const startContainer = getSelection().getRangeAt(0)
                    .startContainer;
                const cellElement =
                    hasClosestByMatchTag(startContainer, "TD") ||
                    hasClosestByMatchTag(startContainer, "TH");
                if (cellElement) {
                    insertColumn(vditor, tableElement, cellElement, "beforebegin");
                }
            };

            const deleteRowElement = document.createElement("button");
            deleteRowElement.setAttribute("type", "button");
            deleteRowElement.setAttribute("aria-label", window.VditorI18n["delete-row"] + "<" + updateHotkeyTip("⌘-") + ">");
            deleteRowElement.setAttribute("data-type", "deleteRow");
            deleteRowElement.innerHTML =
                '<svg><use xlink:href="#vditor-icon-delete-row"></use></svg>';
            deleteRowElement.className =
                "vditor-icon vditor-tooltipped vditor-tooltipped__n";
            deleteRowElement.onclick = () => {
                const startContainer = getSelection().getRangeAt(0)
                    .startContainer;
                const cellElement =
                    hasClosestByMatchTag(startContainer, "TD") ||
                    hasClosestByMatchTag(startContainer, "TH");
                if (cellElement) {
                    deleteRow(vditor, range, cellElement);
                }
            };

            const deleteColumnElement = document.createElement("button");
            deleteColumnElement.setAttribute("type", "button");
            deleteColumnElement.setAttribute("aria-label", window.VditorI18n["delete-column"] + "<" + updateHotkeyTip("⇧⌘-") + ">");
            deleteColumnElement.setAttribute("data-type", "deleteColumn");
            deleteColumnElement.innerHTML =
                '<svg><use xlink:href="#vditor-icon-delete-column"></use></svg>';
            deleteColumnElement.className =
                "vditor-icon vditor-tooltipped vditor-tooltipped__n";
            deleteColumnElement.onclick = () => {
                const startContainer = getSelection().getRangeAt(0)
                    .startContainer;
                const cellElement =
                    hasClosestByMatchTag(startContainer, "TD") ||
                    hasClosestByMatchTag(startContainer, "TH");
                if (cellElement) {
                    deleteColumn(vditor, range, tableElement, cellElement);
                }
            };

            const inputWrap = document.createElement("span");
            inputWrap.setAttribute("aria-label", window.VditorI18n.row);
            inputWrap.className = "vditor-tooltipped vditor-tooltipped__n";
            const input = document.createElement("input");
            inputWrap.appendChild(input);
            input.type = "number";
            input.min = "1";
            input.className = "vditor-input";
            input.style.width = "42px";
            input.style.textAlign = "center";
            input.setAttribute("placeholder", window.VditorI18n.row);
            input.value = tableElement.rows.length.toString();
            input.oninput = () => {
                updateTable();
            };
            input.onkeydown = (event) => {
                if (event.isComposing) {
                    return;
                }
                if (event.key === "Tab") {
                    input2.focus();
                    input2.select();
                    event.preventDefault();
                    return;
                }
                removeBlockElement(vditor, event);
            };

            const input2Wrap = document.createElement("span");
            input2Wrap.setAttribute("aria-label", window.VditorI18n.column);
            input2Wrap.className = "vditor-tooltipped vditor-tooltipped__n";
            const input2 = document.createElement("input");
            input2Wrap.appendChild(input2);
            input2.type = "number";
            input2.min = "1";
            input2.className = "vditor-input";
            input2.style.width = "42px";
            input2.style.textAlign = "center";
            input2.setAttribute("placeholder", window.VditorI18n.column);
            input2.value = tableElement.rows[0].cells.length.toString();
            input2.oninput = () => {
                updateTable();
            };
            input2.onkeydown = (event) => {
                if (event.isComposing) {
                    return;
                }
                if (event.key === "Tab") {
                    input.focus();
                    input.select();
                    event.preventDefault();
                    return;
                }
                removeBlockElement(vditor, event);
            };

            vditor.wysiwyg.popover.insertAdjacentElement("beforeend", left);
            vditor.wysiwyg.popover.insertAdjacentElement("beforeend", center);
            vditor.wysiwyg.popover.insertAdjacentElement("beforeend", right);
            vditor.wysiwyg.popover.insertAdjacentElement("beforeend", insertRowBElement);
            vditor.wysiwyg.popover.insertAdjacentElement("beforeend", insertRowElement);
            vditor.wysiwyg.popover.insertAdjacentElement("beforeend", insertColumnBElement);
            vditor.wysiwyg.popover.insertAdjacentElement("beforeend", insertColumnElement);
            vditor.wysiwyg.popover.insertAdjacentElement("beforeend", deleteRowElement);
            vditor.wysiwyg.popover.insertAdjacentElement("beforeend", deleteColumnElement);
            vditor.wysiwyg.popover.insertAdjacentElement("beforeend", inputWrap);
            vditor.wysiwyg.popover.insertAdjacentHTML("beforeend", " x ");
            vditor.wysiwyg.popover.insertAdjacentElement("beforeend", input2Wrap);
            setPopoverPosition(vditor, tableElement);
        }

        // link ref popover
        const linkRefElement = hasClosestByAttribute(typeElement, "data-type", "link-ref");
        if (linkRefElement) {
            genLinkRefPopover(vditor, linkRefElement);
        }

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
            blockRenderElement = hasClosestByAttribute(typeElement, "data-type", "code-block");
        }
        const blockType = blockRenderElement !== false ? (blockRenderElement.getAttribute("data-type") ?? "") : "";
        const isBlock = blockType.endsWith("-block");
        vditor.wysiwyg.element
            .querySelectorAll(".vditor-wysiwyg__preview")
            .forEach((itemElement) => {
                const block = itemElement.closest("[data-type='code-block']") as HTMLElement;
                if (isCmCodeBlock(block)) {
                    return;
                }
                if (!blockRenderElement || (blockRenderElement !== false && isBlock && !blockRenderElement.contains(itemElement))) {
                    const previousElement = itemElement.previousElementSibling as HTMLElement;
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

        // a popover
        if (aElement) {
            genAPopover(vditor, aElement);
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
            updateBlockHandle(vditor, range.startContainer);
        }
    }, 200);
};

const setPopoverPosition = (vditor: IVditor, element: HTMLElement, popoverType?: "link" | "link-ref" | "image") => {
    let targetElement = element;
    const tableElement = hasClosestByMatchTag(element, "TABLE");
    if (tableElement) {
        targetElement = tableElement;
    }
    const isLinkPanel = popoverType === "link" || popoverType === "link-ref" || popoverType === "image";
    vditor.wysiwyg.popover.classList.toggle("vditor-panel--link", isLinkPanel);
    vditor.wysiwyg.popover.classList.toggle("vditor-panel--link-ref", popoverType === "link-ref");
    vditor.wysiwyg.popover.classList.toggle("vditor-panel--image", popoverType === "image");
    vditor.wysiwyg.popover.style.left = "0";
    vditor.wysiwyg.popover.style.display = "block";
    vditor.wysiwyg.popover.style.top =
        Math.max(-8, targetElement.offsetTop - (isLinkPanel ? vditor.wysiwyg.popover.clientHeight + 8 : 21) -
            vditor.wysiwyg.element.scrollTop) + "px";
    vditor.wysiwyg.popover.style.left =
        Math.min(targetElement.offsetLeft, vditor.wysiwyg.element.clientWidth - vditor.wysiwyg.popover.clientWidth) + "px";
    vditor.wysiwyg.popover.setAttribute("data-top", (targetElement.offsetTop - 21).toString());
};

export const genLinkRefPopover = (vditor: IVditor, linkRefElement: HTMLElement) => {
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
        const range = getEditorRange(vditor);
        // firefox 不会打断 link https://github.com/Vanessa219/vditor/issues/193
        element.insertAdjacentHTML("afterend", Constants.ZWSP);
        range.setStartAfter(element.nextSibling);
        range.collapse(true);
        setSelectionFocus(range);
        event.preventDefault();
    }
};

export const genAPopover = (vditor: IVditor, aElement: HTMLElement) => {
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

    view.append(textInput, hrefInput, copy, remove);
    vditor.wysiwyg.popover.insertAdjacentElement("beforeend", view);
    setPopoverPosition(vditor, aElement, "link");
};

export const genImagePopover = (event: Event, vditor: IVditor) => {
    const imgElement = event.target as HTMLImageElement;
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
}

export function moveDown(range: Range, vditor: IVditor) {
    const element = tryGetElement(range);
    const nextElement = element.nextElementSibling;
    if (!nextElement || (!element.parentElement.isEqualNode(vditor.wysiwyg.element) && element.tagName !== "LI")) {
        return;
    }
    range.insertNode(document.createElement("wbr"));
    nextElement.insertAdjacentElement("afterend", element);
    setRangeByWbr(vditor.wysiwyg.element, range);
    afterRenderEvent(vditor);
    highlightToolbarWYSIWYG(vditor);
}

export function moveUp(range: Range, vditor: IVditor) {
    const element = tryGetElement(range);
    const previousElement = element.previousElementSibling;
    if (!previousElement || (!element.parentElement.isEqualNode(vditor.wysiwyg.element) && element.tagName !== "LI")) {
        return;
    }
    range.insertNode(document.createElement("wbr"));
    previousElement.insertAdjacentElement("beforebegin", element);
    setRangeByWbr(vditor.wysiwyg.element, range);
    afterRenderEvent(vditor);
    highlightToolbarWYSIWYG(vditor);
}
