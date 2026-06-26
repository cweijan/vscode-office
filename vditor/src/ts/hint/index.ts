import {Constants} from "../constants";
import {code160to32} from "../util/code160to32";
import {isCtrl} from "../util/compatibility";
import {execAfterRender} from "../util/fixBrowserBehavior";
import {hasClosestByAttribute, hasClosestByClassName} from "../util/hasClosest";
import {processCodeRender} from "../util/processCode";
import {applyCodeBlockLanguageChange} from "../codeBlock/codeBlockLanguageInput";
import {isCmCodeBlock, updateCodeMirrorLanguage} from "../codeBlock/codeMirrorManager";
import {getCursorPosition, insertHTML, setSelectionFocus} from "../util/selection";

export class Hint {
    public timeId: number;
    public element: HTMLDivElement;
    public recentLanguage: string;
    private splitChar = "";
    private lastIndex = -1;

    constructor(hintExtends: IHintExtend[]) {
        this.timeId = -1;
        this.element = document.createElement("div");
        this.element.className = "vditor-hint";
        this.recentLanguage = "";
    }

    public render(vditor: IVditor) {
        if (!window.getSelection().focusNode) {
            return;
        }
        let currentLineValue: string;
        const range = getSelection().getRangeAt(0);
        currentLineValue = range.startContainer.textContent.substring(0, range.startOffset) || "";

        const key = this.getKey(currentLineValue, vditor.options.hint.extend);

        if (typeof key === "undefined") {
            this.element.style.display = "none";
            clearTimeout(this.timeId);
        } else {
            vditor.options.hint.extend.forEach((item) => {
                if (item.key === this.splitChar) {
                    clearTimeout(this.timeId);
                    this.timeId = window.setTimeout(async () => {
                        this.genHTML(await item.hint(key), key, vditor);
                    }, vditor.options.hint.delay);
                }
            });
        }
    }

    public genHTML(data: IHintData[], key: string, vditor: IVditor) {
        if (data.length === 0) {
            this.element.style.display = "none";
            return;
        }

        const editorElement = vditor[vditor.currentMode].element;
        const textareaPosition = getCursorPosition(editorElement);
        const x = textareaPosition.left +
            (vditor.options.outline.position === "left" ? vditor.outline.element.offsetWidth : 0);
        const y = textareaPosition.top;
        let hintsHTML = "";

        data.forEach((hintData, i) => {
            if (i > 7) {
                return;
            }
            // process high light
            let html = hintData.html;
            if (key !== "") {
                const lastIndex = html.lastIndexOf(">") + 1;
                let replaceHtml = html.substr(lastIndex);
                const replaceIndex = replaceHtml.toLowerCase().indexOf(key.toLowerCase());
                if (replaceIndex > -1) {
                    replaceHtml = replaceHtml.substring(0, replaceIndex) + "<b>" +
                        replaceHtml.substring(replaceIndex, replaceIndex + key.length) + "</b>" +
                        replaceHtml.substring(replaceIndex + key.length);
                    html = html.substr(0, lastIndex) + replaceHtml;
                }
            }
            const className = i === 0 ? " class='vditor-hint--current'" : "";
            const currentAttr = (hintData as IHintData & { current?: boolean }).current
                ? " data-current='true'"
                : "";
            const currentDesc = (hintData as IHintData & { current?: boolean }).current
                ? `<span class="vditor-hint__current-desc">current</span>`
                : "";
            hintsHTML += `<button data-value="${encodeURIComponent(hintData.value)} "${className}${currentAttr}><span class="vditor-hint__label">${html}</span>${currentDesc}</button>`;
        });

        this.element.innerHTML = hintsHTML;
        const lineHeight = parseInt(document.defaultView.getComputedStyle(editorElement, null)
            .getPropertyValue("line-height"), 10);
        this.element.style.top = `${y + (lineHeight || 22)}px`;
        this.element.style.left = `${x}px`;
        this.element.style.display = "block";
        this.element.style.right = "auto";

        this.element.querySelectorAll("button").forEach((element) => {
            element.addEventListener("click", (event) => {
                this.fillHint(element, vditor);
                event.preventDefault();
            });
        });
        // hint 展现在上部
        if (this.element.getBoundingClientRect().bottom > window.innerHeight) {
            this.element.style.top = `${y - this.element.offsetHeight}px`;
        }
        if (this.element.getBoundingClientRect().right > window.innerWidth) {
            this.element.style.left = "auto";
            this.element.style.right = "0";
        }
    }

    public fillHint = (element: HTMLElement, vditor: IVditor) => {
        this.element.style.display = "none";

        const value = decodeURIComponent(element.getAttribute("data-value"));
        const cmLangSearch = document.activeElement?.classList.contains("vditor-cm-chrome__lang-search")
            ? document.activeElement as HTMLInputElement
            : null;
        if (cmLangSearch) {
            const lang = value.trimRight();
            const codeBlockElement = cmLangSearch.closest("[data-type='code-block']") as HTMLElement;
            if (codeBlockElement) {
                applyCodeBlockLanguageChange(vditor, codeBlockElement, lang);
            }
            this.recentLanguage = lang;
            return;
        }

        const range: Range = window.getSelection().getRangeAt(0);

        range.setStart(range.startContainer, this.lastIndex);
        range.deleteContents();

        if (vditor.options.hint.parse) {
            if (vditor.currentMode === "wysiwyg") {
                insertHTML(vditor.lute.SpinVditorDOM(value), vditor);
            } else {
                insertHTML(vditor.lute.SpinVditorIRDOM(value), vditor);
            }
        } else {
            insertHTML(value, vditor);
        }
        range.collapse(false);
        setSelectionFocus(range);

        if (vditor.currentMode === "wysiwyg") {
            const preElement = hasClosestByClassName(range.startContainer, "vditor-wysiwyg__block");
            if (preElement && preElement.getAttribute("data-type") === "code-block") {
                if (isCmCodeBlock(preElement)) {
                    updateCodeMirrorLanguage(preElement, value.trimRight());
                } else if (preElement.lastElementChild.classList.contains("vditor-wysiwyg__preview")) {
                    preElement.lastElementChild.innerHTML = preElement.firstElementChild.innerHTML;
                    processCodeRender(preElement.lastElementChild as HTMLElement, vditor);
                    updateCodeMirrorLanguage(preElement, value.trimRight());
                }
            }
        } else if (vditor.currentMode === "ir") {
            const codeBlockElement = hasClosestByAttribute(range.startContainer, "data-type", "code-block");
            if (codeBlockElement && isCmCodeBlock(codeBlockElement)) {
                updateCodeMirrorLanguage(codeBlockElement, value.trimRight());
            } else {
                const preElement = hasClosestByClassName(range.startContainer, "vditor-ir__marker--pre");
                if (preElement && preElement.nextElementSibling.classList.contains("vditor-ir__preview")) {
                    preElement.nextElementSibling.innerHTML = preElement.innerHTML;
                    processCodeRender(preElement.nextElementSibling as HTMLElement, vditor);
                }
            }
        }
        execAfterRender(vditor);
    }

    public select(event: KeyboardEvent, vditor: IVditor) {

        if (this.element.querySelectorAll("button").length === 0 ||
            this.element.style.display === "none") {
            return false;
        }

        const scrollCurrentIntoView = () => {
            (this.element.querySelector(".vditor-hint--current") as HTMLElement | null)
                ?.scrollIntoView({block: "nearest"});
        };
        const currentHintElement: HTMLElement = this.element.querySelector(".vditor-hint--current");

        if (event.key === "ArrowDown") {
            event.preventDefault();
            event.stopPropagation();
            currentHintElement.removeAttribute("class");
            if (!currentHintElement.nextElementSibling) {
                this.element.children[0].className = "vditor-hint--current";
            } else {
                currentHintElement.nextElementSibling.className = "vditor-hint--current";
            }
            scrollCurrentIntoView();
            return true;
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            event.stopPropagation();
            currentHintElement.removeAttribute("class");
            if (!currentHintElement.previousElementSibling) {
                const length = this.element.children.length;
                this.element.children[length - 1].className = "vditor-hint--current";
            } else {
                currentHintElement.previousElementSibling.className = "vditor-hint--current";
            }
            scrollCurrentIntoView();
            return true;
        } else if (!isCtrl(event) && !event.shiftKey && !event.altKey && event.key === "Enter" && !event.isComposing) {
            event.preventDefault();
            event.stopPropagation();
            this.fillHint(currentHintElement, vditor);
            return true;
        }
        return false;
    }

    private getKey(currentLineValue: string, extend: IHintExtend[]) {
        this.lastIndex = -1;
        this.splitChar = "";
        extend.forEach((item) => {
            const currentLastIndex = currentLineValue.lastIndexOf(item.key);
            if (this.lastIndex < currentLastIndex) {
                this.splitChar = item.key;
                this.lastIndex = currentLastIndex;
            }
        });

        let key;
        if (this.lastIndex === -1) {
            return key;
        }
        const lineArray = currentLineValue.split(this.splitChar);
        const lastItem = lineArray[lineArray.length - 1];
        const maxLength = 32;
        if (lineArray.length > 1 && lastItem.trim() === lastItem) {
            if (lineArray.length === 2 && lineArray[0] === "" && lineArray[1].length < maxLength) {
                key = lineArray[1];
            } else {
                const preChar = lineArray[lineArray.length - 2].slice(-1);
                if (code160to32(preChar) === " " && lastItem.length < maxLength) {
                    key = lastItem;
                }
            }
        }
        return key;
    }
}
