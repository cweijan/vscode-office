import {Constants} from "../constants";
import {renderHtmlInlineFromMd} from "../htmlInline/renderHtmlInline";
import {processAfterRender} from "../ir/process";
import {isValidFontColor} from "../ui/fontColorPanel";
import {afterRenderEvent} from "../wysiwyg/afterRenderEvent";
import {getEditorRange, setRangeByWbr, setSelectionFocus} from "./selection";

const stripSelectionDecorations = (container: HTMLElement) => {
    container.querySelectorAll(".vditor-ir__marker, wbr").forEach((element) => {
        element.remove();
    });
};

export const getSelectionTextForFontColor = (range: Range, vditor: IVditor): string => {
    if (range.collapsed) {
        return "";
    }
    const container = document.createElement("div");
    container.appendChild(range.cloneContents());
    if (vditor.currentMode === "ir") {
        stripSelectionDecorations(container);
    } else {
        container.querySelectorAll("wbr").forEach((element) => {
            element.remove();
        });
    }
    return (container.textContent || "").replaceAll(Constants.ZWSP, "");
};

export const hasTextSelection = (vditor: IVditor): boolean => {
    const range = getEditorRange(vditor);
    return getSelectionTextForFontColor(range, vditor).length > 0;
};

const hasColorInMdSource = (mdSource: string): boolean => /color\s*:/i.test(mdSource);

export const isInsideFontColor = (element: HTMLElement): boolean => {
    let node: HTMLElement | null = element;
    while (node && !node.classList.contains("vditor-reset")) {
        if (node.getAttribute("data-type") === "html-inline") {
            const mdSource = node.getAttribute("data-md-source") || "";
            if (hasColorInMdSource(mdSource)) {
                return true;
            }
            const display = node.querySelector(".vditor-html-inline__display");
            if (display && /<span[^>]*style\s*=\s*["'][^"']*color/i.test(display.innerHTML)) {
                return true;
            }
        }
        node = node.parentElement;
    }
    return false;
};

export const applyFontColor = (vditor: IVditor, color: string): boolean => {
    if (!isValidFontColor(color)) {
        return false;
    }

    const range = getEditorRange(vditor);
    const selectedText = getSelectionTextForFontColor(range, vditor);
    if (!selectedText) {
        return false;
    }

    const mdSource = `<span style="color: ${color};">${Lute.EscapeHTMLStr(selectedText)}</span>`;
    const inlineHtml = renderHtmlInlineFromMd(vditor, mdSource);
    if (!inlineHtml) {
        return false;
    }

    vditor[vditor.currentMode].preventInput = true;
    range.deleteContents();

    const pasteTemplate = document.createElement("template");
    pasteTemplate.innerHTML = inlineHtml;
    range.insertNode(pasteTemplate.content.cloneNode(true));
    range.collapse(false);
    setSelectionFocus(range);
    setRangeByWbr(vditor[vditor.currentMode].element, range);

    if (vditor.currentMode === "wysiwyg") {
        afterRenderEvent(vditor);
    } else if (vditor.currentMode === "ir") {
        processAfterRender(vditor);
    }

    return true;
};
