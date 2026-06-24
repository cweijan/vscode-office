import {enterSpecialBlockEdit, focusCodeBlock, isSpecialPreviewBlock} from "../codeBlock/codeMirrorManager";

/** 点击预览区：特殊块进入 CodeMirror 编辑，普通块聚焦已有 CM */
export const showCode = (previewElement: HTMLElement, vditor: IVditor, first = true) => {
    const blockElement = previewElement.closest(
        "[data-type='code-block'], [data-type='math-block']",
    ) as HTMLElement;
    if (!blockElement) {
        return;
    }
    if (isSpecialPreviewBlock(blockElement)) {
        enterSpecialBlockEdit(vditor, blockElement);
        return;
    }
    focusCodeBlock(blockElement, vditor, first);
};

export const focusWysiwygCodeBlock = (blockElement: HTMLElement, vditor: IVditor, first = true) => {
    return focusCodeBlock(blockElement, vditor, first);
};
