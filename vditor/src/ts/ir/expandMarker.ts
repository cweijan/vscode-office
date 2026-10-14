import {hasClosestByClassName, hasTopClosestByClassName} from "../util/hasClosest";
import {
    escapeObsidianTagRange,
    escapeWikilinkRange,
    focusObsidianTagEditingRange,
    focusObsidianTagEditingRangeFromDisplay,
    focusWikilinkEditingRange,
    focusWikilinkEditingRangeFromDisplay,
    isRangeInObsidianTagDisplay,
    isRangeInObsidianTagEditingArea,
    isRangeInWikilinkDisplay,
    isRangeInWikilinkEditingArea,
    setSelectionFocus,
} from "../util/selection";

const focusExpandedWikilink = (nodeElement: HTMLElement, range: Range, atEnd = true, fromOutside = false) => {
    const dataType = nodeElement.getAttribute("data-type");
    if (dataType !== "wikilink" && dataType !== "wikilink-embed") {
        return false;
    }
    if (!fromOutside) {
        if (isRangeInWikilinkDisplay(nodeElement, range)) {
            focusWikilinkEditingRangeFromDisplay(range, nodeElement);
            return true;
        }
        if (isRangeInWikilinkEditingArea(nodeElement, range)) {
            setSelectionFocus(range);
            return true;
        }
        return false;
    }
    focusWikilinkEditingRange(range, nodeElement, atEnd);
    return true;
};

const focusExpandedObsidianTag = (nodeElement: HTMLElement, range: Range, atEnd = true, fromOutside = false) => {
    if (nodeElement.getAttribute("data-type") !== "obsidian-tag") {
        return false;
    }
    if (!fromOutside) {
        if (isRangeInObsidianTagDisplay(nodeElement, range)) {
            focusObsidianTagEditingRangeFromDisplay(range, nodeElement);
            return true;
        }
        if (isRangeInObsidianTagEditingArea(nodeElement, range)) {
            setSelectionFocus(range);
            return true;
        }
        return false;
    }
    focusObsidianTagEditingRange(range, nodeElement, atEnd);
    return true;
};

const focusExpandedInlineNode = (nodeElement: HTMLElement, range: Range, atEnd = true, fromOutside = false) => {
    if (focusExpandedWikilink(nodeElement, range, atEnd, fromOutside)) {
        return true;
    }
    return focusExpandedObsidianTag(nodeElement, range, atEnd, fromOutside);
};

const escapeSpecialInlineNodeRange = (nodeElement: HTMLElement, range: Range) => {
    const dataType = nodeElement.getAttribute("data-type");
    if (dataType === "wikilink" || dataType === "wikilink-embed") {
        escapeWikilinkRange(range, nodeElement);
        return true;
    }
    if (dataType === "obsidian-tag") {
        escapeObsidianTagRange(range, nodeElement);
        return true;
    }
    return false;
};

const nextIsNode = (range: Range) => {
    const startContainer = range.startContainer;
    if (startContainer.nodeType === 3 && startContainer.nodeValue.length !== range.startOffset) {
        return false;
    }

    let nextNode: HTMLElement = startContainer.nextSibling as HTMLElement;

    while (nextNode && nextNode.textContent === "") {
        nextNode = nextNode.nextSibling as HTMLElement;
    }

    if (!nextNode) {
        // *em*|**string**
        const markerElement = hasClosestByClassName(startContainer, "vditor-ir__marker");
        if (markerElement && !markerElement.nextSibling) {
            const parentNextNode = startContainer.parentElement.parentElement.nextSibling as HTMLElement;
            if (parentNextNode && parentNextNode.nodeType !== 3 &&
                parentNextNode.classList.contains("vditor-ir__node")) {
                return parentNextNode;
            }
        }
        return false;
    } else if (nextNode && nextNode.nodeType !== 3 && nextNode.classList.contains("vditor-ir__node") &&
        !nextNode.getAttribute("data-block")) {
        // test|*em*
        return nextNode;
    }

    return false;
};

const previousIsNode = (range: Range) => {
    const startContainer = range.startContainer;
    const previousNode = startContainer.previousSibling as HTMLElement;
    if (startContainer.nodeType === 3 && range.startOffset === 0 && previousNode && previousNode.nodeType !== 3 &&
        // *em*|text
        previousNode.classList.contains("vditor-ir__node") && !previousNode.getAttribute("data-block")) {
        return previousNode;
    }
    return false;
};

export const expandMarker = (range: Range, root: HTMLElement) => {
    let collapsedExpandedWikilink: HTMLElement | null = null;
    root.querySelectorAll(".vditor-ir__node--expand").forEach((item) => {
        if ((item as HTMLElement).classList.contains("vditor-code-block--cm")) {
            return;
        }
        const element = item as HTMLElement;
        const dataType = element.getAttribute("data-type");
        if (dataType === "wikilink" || dataType === "wikilink-embed" || dataType === "obsidian-tag") {
            collapsedExpandedWikilink = element;
        }
        element.classList.remove("vditor-ir__node--expand");
    });

    const nodeElement = hasTopClosestByClassName(range.startContainer, "vditor-ir__node");
    const nodeElementEnd = !range.collapsed && hasTopClosestByClassName(range.endContainer, "vditor-ir__node");
    // 选中文本为同一个 nodeElement 内时，需要展开
    if (!range.collapsed && (!nodeElement || nodeElement !== nodeElementEnd)) {
        return;
    }

    if (nodeElement) {
        if (nodeElement.getAttribute("contenteditable") === "false") {
            return;
        }
        nodeElement.classList.add("vditor-ir__node--expand");
        nodeElement.classList.remove("vditor-ir__node--hidden");
        // https://github.com/Vanessa219/vditor/issues/615 safari中光标位置跳动
        if (!focusExpandedInlineNode(nodeElement, range)) {
            if (escapeSpecialInlineNodeRange(nodeElement, range)) {
                nodeElement.classList.remove("vditor-ir__node--expand");
            }
            setSelectionFocus(range);
        }
        return;
    }

    // Adjacent text belongs outside a wikilink; only direct clicks enter its source.
    const isWikilink = (node: HTMLElement) => {
        const type = node.getAttribute("data-type");
        return type === "wikilink" || type === "wikilink-embed";
    };
    const nextNode = nextIsNode(range);
    if (nextNode && !isWikilink(nextNode) && nextNode !== collapsedExpandedWikilink) {
        if (nextNode.getAttribute("contenteditable") === "false") {
            return;
        }
        nextNode.classList.add("vditor-ir__node--expand");
        nextNode.classList.remove("vditor-ir__node--hidden");
        focusExpandedInlineNode(nextNode, range, false, true);
        return;
    }

    const previousNode = previousIsNode(range);
    if (previousNode && !isWikilink(previousNode) && previousNode !== collapsedExpandedWikilink) {
        if (previousNode.getAttribute("contenteditable") === "false") {
            return;
        }
        previousNode.classList.add("vditor-ir__node--expand");
        previousNode.classList.remove("vditor-ir__node--hidden");
        focusExpandedInlineNode(previousNode, range, true, true);
        return;
    }
};
