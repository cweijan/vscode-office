import {updateHotkeyTip} from "../util/compatibility";
import {bindCodeBlockLanguageInput} from "./codeBlockLanguageInput";
import {focusCodeBlockChromeLanguage} from "./codeBlockChrome";
import {
    getCodeLanguageName,
    isCmCodeBlock,
    resolveCmCodeBlock,
    shouldShowLanguagePopover,
} from "./codeMirrorManager";

const CM_LANG_POPOVER_CLASS = "vditor-popover--cm-lang";
const LANG_INSET_TOP = 8;
const LANG_INSET_LEFT = 8;

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
        Math.max(-8, blockElement.offsetTop + LANG_INSET_TOP - editorElement.scrollTop) + "px";
    popover.style.left =
        Math.min(
            blockElement.offsetLeft + LANG_INSET_LEFT,
            editorElement.clientWidth - popover.clientWidth - 8,
        ) + "px";
    popover.setAttribute("data-top", (blockElement.offsetTop + LANG_INSET_TOP).toString());
};

/** 非 CM 代码块：popover 语言输入 */
export const showCodeBlockLanguagePopover = (vditor: IVditor, blockElement: HTMLElement) => {
    const block = resolveCmCodeBlock(vditor, blockElement);
    if (!block || !shouldShowLanguagePopover(block) || isCmCodeBlock(block)) {
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

    popover.classList.add(CM_LANG_POPOVER_CLASS);
    popover.innerHTML = "";

    const languageWrap = document.createElement("span");
    languageWrap.setAttribute("aria-label", window.VditorI18n.language + "<" + updateHotkeyTip("⌥Enter") + ">");
    languageWrap.className = "vditor-tooltipped vditor-tooltipped__n";
    const language = document.createElement("input");
    languageWrap.appendChild(language);

    language.className = "vditor-input";
    language.setAttribute("placeholder", window.VditorI18n.language);
    language.value = getCodeLanguageName(codeElement);

    bindCodeBlockLanguageInput(vditor, language, getBlock, {
        onAfterInput: (currentBlock) => {
            setCodeBlockPopoverPosition(vditor, currentBlock);
        },
    });

    popover.insertAdjacentElement("beforeend", languageWrap);
    setCodeBlockPopoverPosition(vditor, block);
};

export const focusCodeBlockLanguageInput = (vditor: IVditor, blockElement?: HTMLElement | null) => {
    return focusCodeBlockChromeLanguage(vditor, blockElement);
};

export const focusIrCodeBlockLanguageMarker = (blockElement: HTMLElement, vditor: IVditor) => {
    return focusCodeBlockChromeLanguage(vditor, blockElement);
};
