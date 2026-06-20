import {buildEditorHtmlForMarkdown} from "../codeBlock/codeMirrorManager";

export const getMarkdown = (vditor: IVditor) => {
    if (vditor.currentMode === "wysiwyg") {
        return vditor.lute.VditorDOM2Md(buildEditorHtmlForMarkdown(vditor));
    }
    if (vditor.currentMode === "ir") {
        return vditor.lute.VditorIRDOM2Md(buildEditorHtmlForMarkdown(vditor));
    }
    return "";
};
