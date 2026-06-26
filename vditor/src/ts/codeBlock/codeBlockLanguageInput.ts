import {processAfterRender} from "../ir/process";
import {processCodeRender} from "../util/processCode";
import {afterRenderEvent} from "../wysiwyg/afterRenderEvent";
import {updateCodeMirrorLanguage} from "./codeMirrorManager";

const afterCodeBlockLanguageChange = (vditor: IVditor) => {
    if (vditor.currentMode === "wysiwyg") {
        afterRenderEvent(vditor);
    } else if (vditor.currentMode === "ir") {
        processAfterRender(vditor);
    }
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
