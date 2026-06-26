import {Constants} from "../constants";

export const renderHtmlInlineFromMd = (vditor: IVditor, md: string): string => {
    const trimmed = md.trim();
    if (!trimmed) {
        return "";
    }
    const wrapper = `${Constants.ZWSP}${trimmed}${Constants.ZWSP}`;
    const html = vditor.currentMode === "ir"
        ? vditor.lute.Md2VditorIRDOM(wrapper)
        : vditor.lute.Md2VditorDOM(wrapper);
    const temp = document.createElement("div");
    temp.innerHTML = html;
    const node = temp.querySelector('[data-type="html-inline"]') as HTMLElement | null;
    return node?.outerHTML ?? "";
};
