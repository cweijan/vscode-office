import {hasClosestByMatchTag} from "./hasClosest";
import {setRangeByWbr} from "./selection";

// List markers live on OL/LI attributes, not in their text content. Serialize
// the selected item before replacing its container so those markers survive.
export const setListHeading = (vditor: IVditor, range: Range, prefix: string): boolean => {
    const item = hasClosestByMatchTag(range.startContainer, "LI");
    if (!item || !prefix) {
        return false;
    }
    const list = item.parentElement;
    if (list.tagName !== "OL" && list.tagName !== "UL") {
        return false;
    }
    const items = Array.from(list.children);
    const index = items.indexOf(item);
    const start = Number(list.getAttribute("start") || 1);
    const makeList = (children: Element[], offset: number) => {
        const clone = list.cloneNode(false) as HTMLElement;
        if (list.tagName === "OL") {
            clone.setAttribute("start", String(start + offset));
        }
        children.forEach(child => clone.appendChild(child.cloneNode(true)));
        return clone;
    };
    const selected = makeList([item], index);
    const ir = vditor.currentMode === "ir";
    const markdown = (ir ? vditor.lute.VditorIRDOM2Md(selected.outerHTML) :
        vditor.lute.VditorDOM2Md(selected.outerHTML)).trim();
    const container = document.createElement("div");
    container.innerHTML = ir ? vditor.lute.Md2VditorIRDOM(prefix + markdown) :
        vditor.lute.Md2VditorDOM(prefix + markdown);
    const heading = container.firstElementChild;
    if (!heading) {
        return false;
    }
    heading.appendChild(document.createElement("wbr"));
    const fragment = document.createDocumentFragment();
    if (index > 0) {
        fragment.appendChild(makeList(items.slice(0, index), 0));
    }
    while (container.firstChild) {
        fragment.appendChild(container.firstChild);
    }
    if (index + 1 < items.length) {
        fragment.appendChild(makeList(items.slice(index + 1), index + 1));
    }
    list.replaceWith(fragment);
    setRangeByWbr(ir ? vditor.ir.element : vditor.wysiwyg.element, range);
    return true;
};
