import {focusCodeBlock, isSpecialCodeLanguage} from "../codeBlock/codeMirrorManager";
import {setSelectionFocus} from "../util/selection";

/** 仅用于 mermaid/math 等特殊代码块的编辑/预览切换；普通代码块由 CodeMirror 常驻渲染 */
export const showCode = (previewElement: HTMLElement, vditor: IVditor, first = true) => {
    const blockElement = previewElement.closest(".vditor-wysiwyg__block") as HTMLElement;
    if (focusCodeBlock(blockElement, vditor, first)) {
        return;
    }

    const previousElement = previewElement.previousElementSibling as HTMLElement;
    const range = previousElement.ownerDocument.createRange();
    if (previousElement.tagName === "CODE") {
        previousElement.style.display = "inline-block";
        if (first) {
            range.setStart(previousElement.firstChild, 1);
        } else {
            range.selectNodeContents(previousElement);
        }
    } else {
        previousElement.style.display = "block";

        if (!previousElement.firstChild.firstChild) {
            previousElement.firstChild.appendChild(document.createTextNode(""));
        }
        range.selectNodeContents(previousElement.firstChild);
    }
    if (first) {
        range.collapse(true);
    } else {
        range.collapse(false);
    }
    setSelectionFocus(range);
    if (!isSpecialCodeLanguage(previewElement.firstElementChild as HTMLElement)) {
    }
};

export const focusWysiwygCodeBlock = (blockElement: HTMLElement, vditor: IVditor, first = true) => {
    if (focusCodeBlock(blockElement, vditor, first)) {
        return true;
    }
    return false;
};
