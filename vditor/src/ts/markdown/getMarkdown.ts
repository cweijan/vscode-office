import {buildEditorHtmlForMarkdown} from "../codeBlock/codeMirrorManager";
import {code160to32} from "../util/code160to32";

export const getMarkdown = (vditor: IVditor) => {
    if (vditor.currentMode === "sv") {
        return code160to32(`${vditor.sv.element.textContent}\n`.replace(/\n\n$/, "\n"));
    } else if (vditor.currentMode === "wysiwyg") {
        return vditor.lute.VditorDOM2Md(buildEditorHtmlForMarkdown(vditor));
    } else if (vditor.currentMode === "ir") {
        return vditor.lute.VditorIRDOM2Md(buildEditorHtmlForMarkdown(vditor));
    }
    return "";
};
