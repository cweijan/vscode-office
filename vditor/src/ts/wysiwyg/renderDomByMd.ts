import {isCmCodeBlock, renderCodeBlocks, syncMathBlocksPreviewMode} from "../codeBlock/codeMirrorManager";
import {processCodeRender} from "../util/processCode";
import {renderToc} from "../util/toc";
import {afterRenderEvent} from "./afterRenderEvent";

export const renderDomByMd = (vditor: IVditor, md: string, options = {
    enableAddUndoStack: true,
    enableHint: false,
    enableInput: true,
}) => {
    const editorElement = vditor.wysiwyg.element;
    editorElement.innerHTML = vditor.lute.Md2VditorDOM(md);

    editorElement.querySelectorAll(".vditor-wysiwyg__preview[data-render='2']").forEach((item: HTMLElement) => {
        const parent = item.parentElement as HTMLElement;
        if (isCmCodeBlock(parent)) {
            return;
        }
        processCodeRender(item, vditor);
    });
    syncMathBlocksPreviewMode(editorElement);
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
