import {isCmCodeBlock, renderCodeBlocks, syncMathBlocksDisplayMode} from "../codeBlock/codeMirrorManager";
import {log} from "../util/log";
import {processCodeRender} from "../util/processCode";
import {renderToc} from "../util/toc";
import {afterRenderEvent} from "./afterRenderEvent";

export const renderDomByMd = (vditor: IVditor, md: string, options = {
    enableAddUndoStack: true,
    enableHint: false,
    enableInput: true,
}) => {
    const editorElement = vditor.wysiwyg.element;
    const html = vditor.lute.Md2VditorDOM(md);
    log("Md2VditorDOM", html, "result", vditor.options.debugger);
    editorElement.innerHTML = html;

    editorElement.querySelectorAll(".vditor-wysiwyg__preview[data-render='2']").forEach((item: HTMLElement) => {
        const parent = item.parentElement as HTMLElement;
        if (isCmCodeBlock(parent)) {
            return;
        }
        processCodeRender(item, vditor);
    });
    syncMathBlocksDisplayMode(editorElement, vditor);
    editorElement.querySelectorAll(".vditor-wysiwyg__block[data-type='math-block'] .vditor-wysiwyg__preview").forEach(
        (preview: HTMLElement) => {
            if (preview.getAttribute("data-render") !== "1") {
                processCodeRender(preview, vditor);
            }
        },
    );
    renderCodeBlocks(vditor);

    renderToc(vditor);
    afterRenderEvent(vditor, options);
};
