import { codeMirrorPreviewRender } from "../codeBlock/codeMirrorPreviewRender";
import { ensureMathBlockPreviewMode } from "../codeBlock/codeMirrorManager";
import { codeRender } from "../markdown/codeRender";
import { mathRender } from "../markdown/mathRender";
import { mermaidRender } from "../markdown/mermaidRender";
import { plantumlRender } from "../markdown/plantumlRender";
import { isCmCodeBlock, renderCodeBlocks } from "../codeBlock/codeMirrorManager";

export const processPasteCode = (html: string, text: string, type = "ir") => {
    return false;
};

export const processCodeRender = (previewPanel: HTMLElement, vditor: IVditor) => {
    if (!previewPanel) {
        return;
    }
    const parentElement = previewPanel.parentElement;
    if (!parentElement) {
        return;
    }
    if (parentElement.getAttribute("data-type") === "html-block") {
        previewPanel.setAttribute("data-render", "1");
        return;
    }
    if (isCmCodeBlock(parentElement)) {
        renderCodeBlocks(vditor);
        previewPanel.setAttribute("data-render", "1");
        return;
    }
    const codeElement = previewPanel.firstElementChild as HTMLElement | null;
    if (!codeElement) {
        return;
    }
    const language = codeElement.className.replace("language-", "");
    if (!language) {
        return;
    }
    if (language === "mermaid") {
        mermaidRender(previewPanel, vditor.options.cdn, vditor);
    } else if (language === "plantuml") {
        plantumlRender(previewPanel, vditor.options.cdn);
    } else if (language === "math") {
        mathRender(previewPanel, { cdn: vditor.options.cdn, math: vditor.options.preview.math });
        if (parentElement.getAttribute("data-type") === "math-block") {
            ensureMathBlockPreviewMode(parentElement);
        }
    } else {
        codeRender(previewPanel);
        codeMirrorPreviewRender(previewPanel);
    }

    previewPanel.setAttribute("data-render", "1");
};
