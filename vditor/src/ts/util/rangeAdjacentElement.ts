import { Constants } from "../constants";

export type AdjacentElementMatcher = (node: Node | null) => HTMLElement | null;

export const isZwspOnlyText = (node: Node | null): boolean =>
    !!node && node.nodeType === 3 && (node.textContent ?? "").replaceAll(Constants.ZWSP, "") === "";

export const isLogicalTextStart = (text: string, offset: number): boolean =>
    text.slice(0, offset).replaceAll(Constants.ZWSP, "") === "";

export const isLogicalTextEnd = (text: string, offset: number): boolean =>
    text.slice(offset).replaceAll(Constants.ZWSP, "") === "";

export const findElementFromSibling = (
    start: Node | null,
    direction: "left" | "right",
    matcher: AdjacentElementMatcher,
): HTMLElement | null => {
    let node = start;
    while (node) {
        if (isZwspOnlyText(node)) {
            node = direction === "left" ? node.previousSibling : node.nextSibling;
            continue;
        }
        return matcher(node);
    }
    return null;
};

export const resolveAdjacentElementFromRange = (
    range: Range,
    insideResolver: (range: Range) => HTMLElement | null,
    siblingMatcher: AdjacentElementMatcher,
): HTMLElement | null => {
    const inside = insideResolver(range);
    if (inside) {
        return inside;
    }

    const startContainer = range.startContainer;
    if (startContainer.nodeType === 3) {
        if (isZwspOnlyText(startContainer)) {
            const left = findElementFromSibling(startContainer.previousSibling, "left", siblingMatcher);
            if (left) {
                return left;
            }
            return findElementFromSibling(startContainer.nextSibling, "right", siblingMatcher);
        }
        const text = startContainer.textContent ?? "";
        if (isLogicalTextStart(text, range.startOffset)) {
            const left = findElementFromSibling(startContainer.previousSibling, "left", siblingMatcher);
            if (left) {
                return left;
            }
        }
        if (isLogicalTextEnd(text, range.startOffset)) {
            return findElementFromSibling(startContainer.nextSibling, "right", siblingMatcher);
        }
        return null;
    }
    if (startContainer.nodeType === 1) {
        const element = startContainer as Element;
        if (range.startOffset > 0) {
            const left = findElementFromSibling(element.childNodes[range.startOffset - 1], "left", siblingMatcher);
            if (left) {
                return left;
            }
        }
        return findElementFromSibling(element.childNodes[range.startOffset] ?? null, "right", siblingMatcher);
    }
    return null;
};
