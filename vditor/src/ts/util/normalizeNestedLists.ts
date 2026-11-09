const blockTag = /^(P|UL|OL|BLOCKQUOTE|PRE|DIV|TABLE|H[1-6]|HR)$/;

// A bare empty '-' child immediately after inline parent text serializes as a
// Setext underline in Lute. Give that parent text a paragraph boundary so the
// empty item survives both SpinVditorDOM and Markdown save/reload (#646).
export const normalizeEmptyNestedLists = (root: HTMLElement) => {
    root.querySelectorAll("ul").forEach((list) => {
        const parent = list.parentElement;
        const firstItem = list.firstElementChild;
        if (parent?.tagName !== "LI" || firstItem?.tagName !== "LI" ||
            (firstItem.getAttribute("data-marker") || list.getAttribute("data-marker")) !== "-" ||
            firstItem.textContent.replace(/\u200b/g, "").trim() !== "" ||
            firstItem.querySelector(":not(br):not(wbr):not(p)")) {
            return;
        }
        // Rendered HTML/code previews are not editable Markdown list structure.
        if (list.closest(".vditor-wysiwyg__block, .vditor-wysiwyg__preview, .cm-editor")) {
            return;
        }
        const inlineNodes: Node[] = [];
        let previous = list.previousSibling;
        while (previous && !(previous.nodeType === Node.ELEMENT_NODE && blockTag.test(previous.nodeName))) {
            inlineNodes.unshift(previous);
            previous = previous.previousSibling;
        }
        if (!inlineNodes.some((node) => node.textContent.replace(/\u200b/g, "").trim() !== "" ||
            (node.nodeType === Node.ELEMENT_NODE && node.nodeName !== "WBR"))) {
            return;
        }
        const paragraph = root.ownerDocument.createElement("p");
        paragraph.setAttribute("data-block", "0");
        parent.insertBefore(paragraph, inlineNodes[0]);
        paragraph.append(...inlineNodes);
    });
};
