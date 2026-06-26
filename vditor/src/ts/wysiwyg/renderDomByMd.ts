import {isCmCodeBlock, renderCodeBlocks, syncMathBlocksDisplayMode} from "../codeBlock/codeMirrorManager";
import {log} from "../util/log";
import {processCodeRender} from "../util/processCode";
import {renderToc} from "../util/toc";
import {afterRenderEvent} from "./afterRenderEvent";

export const BOUNDARY_SENTINEL_CLASS = "vditor-editor-boundary";

const BOUNDARY_SENTINEL = `<span class="${BOUNDARY_SENTINEL_CLASS}" data-block="0" contenteditable="true" aria-hidden="true">​</span>`;

export const ensureEditorBoundaryParagraphs = (editorElement: HTMLElement) => {
    editorElement.querySelectorAll(`.${BOUNDARY_SENTINEL_CLASS}`).forEach((el) => el.remove());
    editorElement.insertAdjacentHTML("afterbegin", BOUNDARY_SENTINEL);
    editorElement.insertAdjacentHTML("beforeend", BOUNDARY_SENTINEL);
};

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
    ensureEditorBoundaryParagraphs(editorElement);

    renderToc(vditor);
    afterRenderEvent(vditor, options);
};
