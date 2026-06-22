import {processAfterRender} from "../ir/process";
import {isCtrl} from "../util/compatibility";
import {processCodeRender} from "../util/processCode";
import {afterRenderEvent} from "../wysiwyg/afterRenderEvent";
import {matchCodeMirrorLanguages} from "./codeBlockLanguageHints";
import {focusCodeMirror, updateCodeMirrorLanguage} from "./codeMirrorManager";

const afterCodeBlockLanguageChange = (vditor: IVditor) => {
    if (vditor.currentMode === "wysiwyg") {
        afterRenderEvent(vditor);
    } else if (vditor.currentMode === "ir") {
        processAfterRender(vditor);
    }
};

const getCodeBlockLanguageName = (blockElement: HTMLElement) => {
    const codeElement = blockElement.querySelector("pre code") as HTMLElement | null;
    const match = codeElement?.className.match(/language-([^\s]+)/);
    return match ? match[1] : "";
};

export const applyCodeBlockLanguageChange = (
    vditor: IVditor,
    blockElement: HTMLElement,
    languageName: string,
) => {
    const currentCode = blockElement.querySelector("pre code") as HTMLElement;
    if (!currentCode) {
        return;
    }
    const lang = languageName.trim();
    if (lang !== "") {
        currentCode.className = `language-${lang}`;
        vditor.hint.recentLanguage = lang;
    } else {
        currentCode.className = "";
        vditor.hint.recentLanguage = "";
    }
    if (vditor.currentMode === "wysiwyg" &&
        blockElement.lastElementChild?.classList.contains("vditor-wysiwyg__preview")) {
        blockElement.lastElementChild.innerHTML = blockElement.firstElementChild.innerHTML;
        processCodeRender(blockElement.lastElementChild as HTMLElement, vditor);
    }
    updateCodeMirrorLanguage(blockElement, lang);
    afterCodeBlockLanguageChange(vditor);
};

/** 旧版 popover 语言输入逻辑，可绑定到任意 input */
export const bindCodeBlockLanguageInput = (
    vditor: IVditor,
    language: HTMLInputElement,
    getBlock: () => HTMLElement,
    options?: {
        onAfterInput?: (currentBlock: HTMLElement, event: InputEvent) => void;
    },
) => {
    language.oninput = (e: InputEvent) => {
        const currentBlock = getBlock();
        applyCodeBlockLanguageChange(vditor, currentBlock, language.value);
        options?.onAfterInput?.(currentBlock, e);
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
            focusCodeMirror(getBlock(), false, vditor);
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
        const key = language.value.substring(0, language.selectionStart || 0);
        vditor.hint.genHTML(matchCodeMirrorLanguages(key, getCodeBlockLanguageName(getBlock())), key, vditor);
        event.preventDefault();
    };
};
