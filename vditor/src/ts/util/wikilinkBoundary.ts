import {getSelectionRangeInEditor, setSelectionFocus} from "./selection";

// Chromium can keep the caret inside a marker at the visible edge of a wikilink.
// Move it outside before editing so inserted text and paragraph clones stay plain.
export const escapeWikilinkBoundary = (editor: HTMLElement) => {
    const range = getSelectionRangeInEditor(editor);
    if (!range || !range.collapsed) {
        return;
    }
    const element = range.startContainer.nodeType === Node.TEXT_NODE
        ? range.startContainer.parentElement : range.startContainer as HTMLElement;
    const link = element.closest<HTMLElement>('[data-type="wikilink"], [data-type="wikilink-embed"]');
    if (!link || !editor.contains(link)) {
        return;
    }
    let before = range.startContainer === link && range.startOffset === 0;
    let after = range.startContainer === link && range.startOffset === link.childNodes.length;
    const marker = element.closest<HTMLElement>(".vditor-ir__marker");
    if (marker && marker.parentElement === link) {
        const probe = range.cloneRange();
        probe.selectNodeContents(marker);
        if (marker === link.firstElementChild) {
            probe.setEnd(range.startContainer, range.startOffset);
            before = probe.toString() === "";
        }
        if (marker === link.lastElementChild) {
            probe.setStart(range.startContainer, range.startOffset);
            after = probe.toString() === "";
        }
    }
    if (!before && !after) {
        return;
    }
    let created = false;
    let text = before ? link.previousSibling : link.nextSibling;
    if (!text || text.nodeType !== Node.TEXT_NODE) {
        created = true;
        text = document.createTextNode("\u200b");
        link.parentNode.insertBefore(text, before ? link : link.nextSibling);
    }
    range.setStart(text, before || created ? text.textContent.length : 0);
    range.collapse(true);
    setSelectionFocus(range);
};

export const bindWikilinkBoundary = (editor: HTMLElement) => {
    editor.addEventListener("beforeinput", () => escapeWikilinkBoundary(editor), true);
    editor.addEventListener("compositionstart", () => escapeWikilinkBoundary(editor), true);
    // Run before the editor's Enter and automatic bracket handlers.
    editor.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key.length === 1 || event.key === "Backspace" || event.key === "Delete") {
            escapeWikilinkBoundary(editor);
        }
    }, true);
};
