import {processAfterRender} from "../ir/process";
import {isCtrl, updateHotkeyTip} from "../util/compatibility";
import {processCodeRender} from "../util/processCode";
import {afterRenderEvent} from "../wysiwyg/afterRenderEvent";
import {matchCodeMirrorLanguages} from "./codeBlockLanguageHints";
import {
    focusCodeMirror,
    getCodeLanguageName,
    resolveCmCodeBlock,
    shouldShowLanguagePopover,
    updateCodeMirrorLanguage,
} from "./codeMirrorManager";

export const getModePopover = (vditor: IVditor) => {
    if (vditor.currentMode === "wysiwyg") {
        return vditor.wysiwyg.popover;
    }
    if (vditor.currentMode === "ir") {
        return vditor.ir.popover;
    }
    return null;
};

export const getModeEditorElement = (vditor: IVditor) => {
    if (vditor.currentMode === "wysiwyg") {
        return vditor.wysiwyg.element;
    }
    if (vditor.currentMode === "ir") {
        return vditor.ir.element;
    }
    return null;
};

const setCodeBlockPopoverPosition = (vditor: IVditor, blockElement: HTMLElement) => {
    const popover = getModePopover(vditor);
    const editorElement = getModeEditorElement(vditor);
    if (!popover || !editorElement || !blockElement.isConnected) {
        return;
    }
    popover.style.display = "block";
    popover.style.top =
        Math.max(-8, blockElement.offsetTop - 21 - editorElement.scrollTop) + "px";
    popover.style.left =
        Math.min(blockElement.offsetLeft, editorElement.clientWidth - popover.clientWidth) + "px";
    popover.setAttribute("data-top", (blockElement.offsetTop - 21).toString());
};

const afterCodeBlockLanguageChange = (vditor: IVditor) => {
    if (vditor.currentMode === "wysiwyg") {
        afterRenderEvent(vditor);
    } else if (vditor.currentMode === "ir") {
        processAfterRender(vditor);
    }
};

/** 在代码块上方显示语言输入 popover（WYSIWYG / IR 通用） */
export const showCodeBlockLanguagePopover = (vditor: IVditor, blockElement: HTMLElement) => {
    const block = resolveCmCodeBlock(vditor, blockElement);
    if (!block || !shouldShowLanguagePopover(block)) {
        return;
    }
    const popover = getModePopover(vditor);
    if (!popover) {
        return;
    }

    const codeElement = block.querySelector("pre code") as HTMLElement;
    if (!codeElement) {
        return;
    }

    const getBlock = () => resolveCmCodeBlock(vditor, block) || block;

    popover.innerHTML = "";

    const languageWrap = document.createElement("span");
    languageWrap.setAttribute("aria-label", window.VditorI18n.language + "<" + updateHotkeyTip("⌥Enter") + ">");
    languageWrap.className = "vditor-tooltipped vditor-tooltipped__n";
    const language = document.createElement("input");
    languageWrap.appendChild(language);

    language.className = "vditor-input";
    language.setAttribute("placeholder", window.VditorI18n.language + "<" + updateHotkeyTip("⌥Enter") + ">");
    language.value = getCodeLanguageName(codeElement);

    language.oninput = (e: InputEvent) => {
        const currentBlock = getBlock();
        const currentCode = currentBlock.querySelector("pre code") as HTMLElement;
        if (!currentCode) {
            return;
        }
        const lang = language.value.trim();
        if (lang !== "") {
            currentCode.className = `language-${lang}`;
            vditor.hint.recentLanguage = lang;
        } else {
            currentCode.className = "";
            vditor.hint.recentLanguage = "";
        }
        if (vditor.currentMode === "wysiwyg" &&
            currentBlock.lastElementChild?.classList.contains("vditor-wysiwyg__preview")) {
            currentBlock.lastElementChild.innerHTML = currentBlock.firstElementChild.innerHTML;
            processCodeRender(currentBlock.lastElementChild as HTMLElement, vditor);
        }
        updateCodeMirrorLanguage(currentBlock, lang);
        afterCodeBlockLanguageChange(vditor);
        setCodeBlockPopoverPosition(vditor, currentBlock);
        if (e.detail === 1) {
            focusCodeMirror(currentBlock, true, vditor);
        }
    };

    language.onkeydown = (event: KeyboardEvent) => {
        if (event.isComposing) {
            return;
        }
        if (event.key === "Escape" && vditor.hint.element.style.display === "block") {
            vditor.hint.element.style.display = "none";
            event.preventDefault();
            return;
        }
        vditor.hint.select(event, vditor);
        if (!isCtrl(event) && !event.shiftKey && event.key === "Enter") {
            const currentBlock = getBlock();
            focusCodeMirror(currentBlock, false, vditor);
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
        vditor.hint.genHTML(matchCodeMirrorLanguages(key), key, vditor);
        event.preventDefault();
    };

    popover.insertAdjacentElement("beforeend", languageWrap);
    setCodeBlockPopoverPosition(vditor, block);
};

export const focusCodeBlockLanguageInput = (vditor: IVditor) => {
    const inputElement = getModePopover(vditor)?.querySelector(".vditor-input") as HTMLInputElement;
    if (!inputElement) {
        return false;
    }
    inputElement.focus();
    inputElement.select();
    return true;
};

export const focusIrCodeBlockLanguageMarker = (blockElement: HTMLElement, vditor: IVditor) => {
    showCodeBlockLanguagePopover(vditor, blockElement);
    return focusCodeBlockLanguageInput(vditor);
};
