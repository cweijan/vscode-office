import {markOutlineEditing, pinOutlineActive} from "../outline/updateOutlineActive";
import {mathRender} from "../markdown/mathRender";
import {scrollOutlineTarget, OUTLINE_SCROLL_OFFSET} from "../markdown/outlineRender";
import {execAfterRender, insertAfterBlock, insertBeforeBlock} from "./fixBrowserBehavior";
import {hasClosestByAttribute, hasClosestByClassName} from "./hasClosest";
import {getSelectPosition} from "./selection";

const scrollToHeading = (vditor: IVditor, headingElement: HTMLElement) => {
    const editorElement = vditor[vditor.currentMode].element;
    if (vditor.options.height === "auto") {
        let windowScrollY = headingElement.offsetTop + vditor.element.offsetTop;
        if (!vditor.options.toolbarConfig.pin) {
            windowScrollY += vditor.toolbar.element.offsetHeight;
        }
        window.scrollTo(window.scrollX, windowScrollY - OUTLINE_SCROLL_OFFSET);
        return;
    }
    if (vditor.element.offsetTop < window.scrollY) {
        window.scrollTo(window.scrollX, vditor.element.offsetTop);
    }
    scrollOutlineTarget(editorElement, headingElement);
};

export const renderToc = (vditor: IVditor) => {
    markOutlineEditing(vditor);
    const editorElement = vditor[vditor.currentMode].element;
    let tocHTML = vditor.outline.render(vditor);
    if (tocHTML === "") {
        tocHTML = "[ToC]";
    }
    editorElement.querySelectorAll('[data-type="toc-block"]').forEach((item: HTMLElement) => {
        item.innerHTML = tocHTML;
        mathRender(item, {
            cdn: vditor.options.cdn,
            extPath: vditor.options.extPath,
            math: vditor.options.preview.math,
        });
    });
};

export const clickToc = (event: MouseEvent & { target: HTMLElement }, vditor: IVditor) => {
    const editorElement = vditor[vditor.currentMode].element;
    const tocElement = hasClosestByClassName(event.target, "vditor-toc")
        || hasClosestByAttribute(event.target, "data-type", "toc-block");
    if (!tocElement || !editorElement.contains(tocElement as HTMLElement)) {
        return;
    }

    let target = event.target as HTMLElement;
    while (target && (tocElement as HTMLElement).contains(target)) {
        const targetId = target.getAttribute("data-target-id");
        if (targetId) {
            event.preventDefault();
            event.stopPropagation();
            const headingElement = editorElement.querySelector("#" + CSS.escape(targetId)) as HTMLElement;
            if (headingElement) {
                pinOutlineActive(vditor, targetId);
                scrollToHeading(vditor, headingElement);
            }
            return;
        }
        target = target.parentElement;
    }
};

export const keydownToc = (blockElement: HTMLElement, vditor: IVditor, event: KeyboardEvent, range: Range) => {
    // toc 前无元素，插入空块
    if (blockElement.previousElementSibling &&
        blockElement.previousElementSibling.classList.contains("vditor-toc")) {
        if (event.key === "Backspace" &&
            getSelectPosition(blockElement, vditor[vditor.currentMode].element, range).start === 0) {
            blockElement.previousElementSibling.remove();
            execAfterRender(vditor);
            return true;
        }
        if (insertBeforeBlock(vditor, event, range, blockElement, blockElement.previousElementSibling as HTMLElement)) {
            return true;
        }
    }
    // toc 后无元素，插入空块
    if (blockElement.nextElementSibling &&
        blockElement.nextElementSibling.classList.contains("vditor-toc")) {
        if (event.key === "Delete" &&
            getSelectPosition(blockElement, vditor[vditor.currentMode].element, range).start
            >= blockElement.textContent.trimRight().length) {
            blockElement.nextElementSibling.remove();
            execAfterRender(vditor);
            return true;
        }
        if (insertAfterBlock(vditor, event, range, blockElement, blockElement.nextElementSibling as HTMLElement)) {
            return true;
        }
    }
    // toc 删除
    if (event.key === "Backspace" || event.key === "Delete") {
        const tocElement = hasClosestByClassName(range.startContainer, "vditor-toc");
        if (tocElement) {
            tocElement.remove();
            execAfterRender(vditor);
            return true;
        }
    }
};
