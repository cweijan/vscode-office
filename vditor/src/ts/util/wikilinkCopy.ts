const selector = '[data-type="wikilink"], [data-type="wikilink-embed"]';

const covers = (range: Range, node: Node) => {
    const contents = document.createRange();
    contents.selectNodeContents(node);
    return range.compareBoundaryPoints(Range.START_TO_START, contents) <= 0
        && range.compareBoundaryPoints(Range.END_TO_END, contents) >= 0;
};

const copyLinkText = (link: HTMLElement, fragment: HTMLElement, range: Range) => {
    const display = link.querySelector('.vditor-wikilink__display');
    const source = link.querySelector('.vditor-wikilink__source, [data-newline="1"]');
    // A fully selected rendered label represents the complete link, including its alias.
    if (covers(range, link) || (display && !link.classList.contains('vditor-ir__node--expand')
        && covers(range, display) && range.intersectsNode(display))) {
        const markers = link.querySelectorAll('.vditor-ir__marker');
        return (markers[0]?.textContent || '') + (source?.textContent || display?.textContent || '')
            + (markers[markers.length - 1]?.textContent || '');
    }
    if (display && !link.classList.contains('vditor-ir__node--expand')) {
        return fragment.querySelector('.vditor-wikilink__display')?.textContent || fragment.textContent || '';
    }
    fragment.querySelectorAll('.vditor-wikilink__display').forEach(node => node.remove());
    return fragment.textContent || '';
};

// cloneContents omits the link wrapper when both endpoints are inside its label.
// Normalize complete links to Markdown and partial selections to the selected text.
export const cloneWikilinkCopyContents = (range: Range, editor: HTMLElement): DocumentFragment => {
    const fragment = range.cloneContents();
    const ancestor = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
        ? range.commonAncestorContainer as HTMLElement : range.commonAncestorContainer.parentElement;
    const link = ancestor.closest<HTMLElement>(selector);
    if (link && editor.contains(link)) {
        const container = document.createElement('div');
        container.appendChild(fragment);
        const text = copyLinkText(link, container, range);
        const result = document.createDocumentFragment();
        result.appendChild(document.createTextNode(text));
        return result;
    }
    const originals = Array.from(editor.querySelectorAll<HTMLElement>(selector))
        .filter(node => range.intersectsNode(node));
    const copies = Array.from(fragment.querySelectorAll<HTMLElement>(selector));
    copies.forEach((copy, index) => {
        const original = originals[index];
        if (original) {
            copy.replaceWith(document.createTextNode(copyLinkText(original, copy, range)));
        }
    });
    return fragment;
};
