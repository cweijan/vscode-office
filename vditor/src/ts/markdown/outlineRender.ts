import { pinOutlineActive } from "../outline/updateOutlineActive";
import { closeMobileOutline, isEditorThemeMobileLayout } from "../ui/mobileOutlineMenu";
import { codicon } from "../util/codicon";
import { hasClosestByHeadings } from "../util/hasClosestByHeadings";
import { mathRender } from "./mathRender";

const stripIrOutlineMarkers = (element: HTMLElement) => {
    const clone = element.cloneNode(true) as HTMLElement;
    clone.querySelectorAll(".vditor-ir__marker, wbr").forEach((node) => {
        node.remove();
    });
    return clone;
};

const getOutlineHeadingHTML = (item: HTMLElement, vditor?: IVditor) => {
    if (vditor?.currentMode === "ir") {
        return stripIrOutlineMarkers(item).outerHTML;
    }
    return item.outerHTML.replace("<wbr>", "");
};

export const OUTLINE_SCROLL_OFFSET = 15;

export const getOutlineActiveReferenceY = (vditor: IVditor, contentElement: HTMLElement) => {
    let referenceY = contentElement.getBoundingClientRect().top + OUTLINE_SCROLL_OFFSET;
    if (vditor.options.height === "auto" && !vditor.options.toolbarConfig.pin) {
        referenceY += vditor.toolbar.element.getBoundingClientRect().height;
    }
    return referenceY;
};

export const scrollOutlineTarget = (scrollElement: HTMLElement, idElement: HTMLElement) => {
    const scrollRect = scrollElement.getBoundingClientRect();
    const targetRect = idElement.getBoundingClientRect();
    scrollElement.scrollTop += targetRect.top - scrollRect.top - OUTLINE_SCROLL_OFFSET;
};

export const outlineRender = (contentElement: HTMLElement, targetElement: Element, vditor?: IVditor) => {
    let tocHTML = "";
    const ids: string[] = [];
    Array.from(contentElement.children).forEach((item: HTMLElement, index: number) => {
        if (hasClosestByHeadings(item)) {
            if (vditor) {
                if (!item.id) {
                    item.id = `vditor-outline-target-${index}`;
                } else {
                    const lastIndex = item.id.lastIndexOf("_");
                    item.id = item.id.substring(0, lastIndex === -1 ? undefined : lastIndex) + "_" + index;
                }
            }
            ids.push(item.id);
            tocHTML += getOutlineHeadingHTML(item, vditor);
        }
    });
    if (tocHTML === "") {
        targetElement.innerHTML = "";
        return "";
    }
    const tempElement = document.createElement("div");
    if (vditor) {
        vditor.lute.SetToC(true);
        if (vditor.currentMode === "wysiwyg") {
            tempElement.innerHTML = vditor.lute.SpinVditorDOM("<p>[ToC]</p>" + tocHTML);
        } else {
            tempElement.innerHTML = vditor.lute.HTML2VditorDOM("<p>[ToC]</p>" + tocHTML);
        }
        vditor.lute.SetToC(vditor.options.preview.markdown.toc);
    } else {
        targetElement.classList.add("vditor-outline");
        const lute = Lute.New();
        lute.SetToC(true);
        tempElement.innerHTML = lute.HTML2VditorDOM("<p>[ToC]</p>" + tocHTML);
    }
    const tocRoot = tempElement.firstElementChild;
    if (!tocRoot) {
        targetElement.innerHTML = "";
        return "";
    }
    const headingsElement = tocRoot.querySelectorAll("li > span[data-target-id]");
    headingsElement.forEach((item, index) => {
        if (item.nextElementSibling && item.nextElementSibling.tagName === "UL") {
            const iconHTML = codicon("chevron-down", "vditor-outline__action");
            item.innerHTML = `${iconHTML}<span>${item.innerHTML}</span>`;
        } else {
            item.innerHTML = `<span class="vditor-outline__placeholder" aria-hidden="true"></span><span>${item.innerHTML}</span>`;
        }
        item.setAttribute("data-target-id", ids[index]);
    });
    tocHTML = tocRoot.innerHTML;
    if (headingsElement.length === 0) {
        targetElement.innerHTML = "";
        return tocHTML;
    }
    targetElement.innerHTML = tocHTML;
    if (vditor) {
        mathRender(targetElement as HTMLElement, {
            cdn: vditor.options.cdn,
            extPath: vditor.options.extPath,
            math: vditor.options.preview.math,
        });
    }
    targetElement.firstElementChild?.addEventListener("click", (event: Event) => {
        let target = event.target as HTMLElement;
        while (target && !target.isEqualNode(targetElement)) {
            if (target.classList.contains("vditor-outline__action")) {
                if (target.classList.contains("vditor-outline__action--close")) {
                    target.classList.remove("vditor-outline__action--close");
                    target.parentElement.nextElementSibling.setAttribute("style", "display:block");
                } else {
                    target.classList.add("vditor-outline__action--close");
                    target.parentElement.nextElementSibling.setAttribute("style", "display:none");
                }
                event.preventDefault();
                event.stopPropagation();
                break;
            } else if (target.getAttribute("data-target-id")) {
                event.preventDefault();
                event.stopPropagation();
                const targetId = target.getAttribute("data-target-id");
                const idElement = document.getElementById(targetId);
                if (!idElement) {
                    return;
                }
                if (vditor) {
                    pinOutlineActive(vditor, targetId);
                    if (vditor.options.height === "auto") {
                        let windowScrollY = idElement.offsetTop + vditor.element.offsetTop;
                        if (!vditor.options.toolbarConfig.pin) {
                            windowScrollY += vditor.toolbar.element.offsetHeight;
                        }
                        window.scrollTo(window.scrollX, windowScrollY - OUTLINE_SCROLL_OFFSET);
                    } else {
                        if (vditor.element.offsetTop < window.scrollY) {
                            window.scrollTo(window.scrollX, vditor.element.offsetTop);
                        }
                        scrollOutlineTarget(contentElement, idElement);
                    }
                    if (isEditorThemeMobileLayout(vditor)) {
                        closeMobileOutline(vditor);
                    }
                } else {
                    window.scrollTo(window.scrollX, idElement.offsetTop - OUTLINE_SCROLL_OFFSET);
                }
                break;
            }
            target = target.parentElement;
        }
    });
    return tocHTML;
};
