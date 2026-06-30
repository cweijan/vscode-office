import { indentLess } from "@codemirror/commands";
import { Compartment } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";

import { getModeEditorElement, getModePopover } from "../codeBlock/codeBlockLanguagePopover";
import { loadCodeMirrorHighlightLanguage } from "../codeBlock/codeBlockHighlightLanguages";
import { stopHandledCodeMirrorKeymap, vditorCodeMirrorSetup } from "../codeBlock/codeMirrorSetup";
import { Constants } from "../constants";
import { hasClosestByAttribute, hasClosestByClassName } from "../util/hasClosest";
import { resolveAdjacentElementFromRange } from "../util/rangeAdjacentElement";
import { getEditorRange, setSelectionFocus } from "../util/selection";
import { formatAltEnterHotkeyTip } from "../util/compatibility";
import { codicon } from "../util/codicon";
import {
    getGlobalLocalStorageSetting,
    HTML_EDITOR_LINE_WRAP_KEY,
    setGlobalLocalStorageSetting,
} from "../util/globalLocalStorageSettings";
import { afterRenderEvent } from "../wysiwyg/afterRenderEvent";
import { processAfterRender } from "../ir/process";
import { telemetry } from "../util/telemetry";

const HTML_EDITOR_POPOVER_CLASS = "vditor-popover--html-inline";
const HTML_EDITOR_PANEL_CLASS = "vditor-panel--html-inline";
const POPOVER_INSET = 8;
const VIEWPORT_MARGIN = 12;
const MD_SOURCE_ESC_NEWLINE = "_esc_newline_";

const decodeMdSourceAttr = (raw: string | null): string => {
    if (!raw) {
        return "";
    }
    return raw.replaceAll(MD_SOURCE_ESC_NEWLINE, "\n");
};

type HtmlEditTarget = {
    anchorElement: HTMLElement;
    focusElement: HTMLElement;
    getSource: () => string;
    applySource: (source: string) => HTMLElement | null;
    remove: () => void;
};

type HtmlEditorPopoverBinding = {
    view: EditorView;
    languageCompartment: Compartment;
    wrapCompartment: Compartment;
    lineWrapEnabled: boolean;
};

let activeHtmlEditorPopover: HtmlEditorPopoverBinding | null = null;
let positionAnchor: HTMLElement | null = null;
let positionVditor: IVditor | null = null;
let scrollRepositionHandler: (() => void) | null = null;

const destroyHtmlEditorCodeMirror = () => {
    if (!activeHtmlEditorPopover) {
        return;
    }
    activeHtmlEditorPopover.view.destroy();
    activeHtmlEditorPopover = null;
};

const detachPopoverReposition = () => {
    if (scrollRepositionHandler) {
        window.removeEventListener("scroll", scrollRepositionHandler, true);
        if (positionVditor) {
            getModeEditorElement(positionVditor)?.removeEventListener("scroll", scrollRepositionHandler);
        }
    }
    scrollRepositionHandler = null;
    positionAnchor = null;
    positionVditor = null;
};

const getPopoverContainer = (editorElement: HTMLElement) => editorElement.parentElement as HTMLElement;

const isAnchorVisible = (editorElement: HTMLElement, anchorElement: HTMLElement) => {
    const anchorRect = anchorElement.getClientRects()[0] || anchorElement.getBoundingClientRect();
    const editorRect = editorElement.getBoundingClientRect();
    const viewportTop = Math.max(0, editorRect.top);
    const viewportBottom = Math.min(window.innerHeight, editorRect.bottom);
    const viewportLeft = Math.max(0, editorRect.left);
    const viewportRight = Math.min(window.innerWidth, editorRect.right);

    return anchorRect.bottom > viewportTop &&
        anchorRect.top < viewportBottom &&
        anchorRect.right > viewportLeft &&
        anchorRect.left < viewportRight;
};

const clampHtmlEditorPopoverPosition = (vditor: IVditor, anchorElement: HTMLElement) => {
    const popover = getModePopover(vditor);
    const editorElement = getModeEditorElement(vditor);
    if (!popover || !editorElement || !anchorElement.isConnected) {
        return;
    }
    const container = getPopoverContainer(editorElement);
    if (!container) {
        return;
    }

    popover.style.display = "block";
    const anchorRect = anchorElement.getClientRects()[0] || anchorElement.getBoundingClientRect();
    const popoverWidth = popover.offsetWidth;
    const popoverHeight = popover.offsetHeight;
    const containerRect = container.getBoundingClientRect();

    let viewportTop = anchorRect.bottom + POPOVER_INSET;
    let viewportLeft = anchorRect.left + POPOVER_INSET;

    if (viewportTop + popoverHeight > window.innerHeight - VIEWPORT_MARGIN) {
        const aboveTop = anchorRect.top - popoverHeight - POPOVER_INSET;
        if (aboveTop >= VIEWPORT_MARGIN) {
            viewportTop = aboveTop;
        } else {
            viewportTop = Math.max(
                VIEWPORT_MARGIN,
                window.innerHeight - popoverHeight - VIEWPORT_MARGIN,
            );
        }
    }
    if (viewportTop < VIEWPORT_MARGIN) {
        viewportTop = VIEWPORT_MARGIN;
    }

    if (viewportLeft + popoverWidth > window.innerWidth - VIEWPORT_MARGIN) {
        viewportLeft = window.innerWidth - popoverWidth - VIEWPORT_MARGIN;
    }
    if (viewportLeft < VIEWPORT_MARGIN) {
        viewportLeft = VIEWPORT_MARGIN;
    }

    const maxLeft = containerRect.left + container.clientWidth - popoverWidth - VIEWPORT_MARGIN;
    if (viewportLeft > maxLeft) {
        viewportLeft = Math.max(containerRect.left + VIEWPORT_MARGIN, maxLeft);
    }

    popover.style.position = "absolute";
    popover.style.top = `${Math.round(viewportTop - containerRect.top)}px`;
    popover.style.left = `${Math.round(viewportLeft - containerRect.left)}px`;

    const editorRect = editorElement.getBoundingClientRect();
    const anchorTopInEditor = anchorRect.top - editorRect.top + editorElement.scrollTop;
    popover.setAttribute("data-top", String(anchorTopInEditor + POPOVER_INSET));
};

const attachPopoverReposition = (vditor: IVditor, anchorElement: HTMLElement) => {
    detachPopoverReposition();
    positionAnchor = anchorElement;
    positionVditor = vditor;
    scrollRepositionHandler = () => {
        if (positionAnchor?.isConnected && positionVditor) {
            const editorElement = getModeEditorElement(positionVditor);
            if (!editorElement || !isAnchorVisible(editorElement, positionAnchor)) {
                hideHtmlEditorPopover(positionVditor);
                return;
            }
            clampHtmlEditorPopoverPosition(positionVditor, positionAnchor);
        }
    };
    window.addEventListener("scroll", scrollRepositionHandler, true);
    getModeEditorElement(vditor)?.addEventListener("scroll", scrollRepositionHandler);
};

const scheduleHtmlEditorPopoverPosition = (vditor: IVditor, anchorElement: HTMLElement) => {
    requestAnimationFrame(() => {
        if (!anchorElement.isConnected) {
            return;
        }
        clampHtmlEditorPopoverPosition(vditor, anchorElement);
        attachPopoverReposition(vditor, anchorElement);
    });
};

const hideHtmlEditorPopover = (vditor: IVditor) => {
    const popover = getModePopover(vditor);
    if (!popover) {
        return;
    }
    detachPopoverReposition();
    destroyHtmlEditorCodeMirror();
    popover.style.position = "";
    popover.style.display = "none";
    popover.classList.remove(HTML_EDITOR_POPOVER_CLASS, HTML_EDITOR_PANEL_CLASS);
    popover.innerHTML = "";
};

const restoreFocusAfterHtmlRemove = (
    vditor: IVditor,
    parent: HTMLElement | null,
    next: Node | null,
) => {
    const editorElement = getModeEditorElement(vditor);
    if (!editorElement) {
        return;
    }
    editorElement.focus({ preventScroll: true });
    if (!parent?.isConnected) {
        return;
    }
    const range = getEditorRange(vditor);
    if (next && parent.contains(next)) {
        if (next.nodeType === 3) {
            range.setStart(next, 0);
        } else {
            range.setStartBefore(next);
        }
    } else {
        parent.insertAdjacentHTML("beforeend", Constants.ZWSP);
        range.selectNodeContents(parent);
        range.collapse(false);
    }
    range.collapse(true);
    setSelectionFocus(range);
};

const restoreFocusToHtmlElement = (vditor: IVditor, element: HTMLElement | null) => {
    const editorElement = getModeEditorElement(vditor);
    if (!editorElement) {
        return;
    }
    editorElement.focus({ preventScroll: true });
    if (!element?.isConnected) {
        return;
    }
    const range = getEditorRange(vditor);
    element.insertAdjacentHTML("afterend", Constants.ZWSP);
    range.setStartAfter(element.nextSibling as Node);
    range.collapse(true);
    setSelectionFocus(range);
};

const closeHtmlEditorPopover = (
    vditor: IVditor,
    focusElement: HTMLElement | null,
    removedParent?: HTMLElement | null,
    removedNext?: Node | null,
) => {
    hideHtmlEditorPopover(vditor);
    if (removedParent !== undefined) {
        restoreFocusAfterHtmlRemove(vditor, removedParent, removedNext ?? null);
        return;
    }
    restoreFocusToHtmlElement(vditor, focusElement);
};

const notifyAfterHtmlEditorChange = (vditor: IVditor) => {
    if (vditor.currentMode === "ir") {
        processAfterRender(vditor);
        return;
    }
    afterRenderEvent(vditor);
};

const renderHtmlInlineFromMd = (vditor: IVditor, md: string): string => {
    const trimmed = md.trim();
    if (!trimmed) {
        return "";
    }
    const wrapper = `${Constants.ZWSP}${trimmed}${Constants.ZWSP}`;
    const html = vditor.currentMode === "ir"
        ? vditor.lute.Md2VditorIRDOM(wrapper)
        : vditor.lute.Md2VditorDOM(wrapper);
    const temp = document.createElement("div");
    temp.innerHTML = html;
    const node = temp.querySelector('[data-type="html-inline"]') as HTMLElement | null;
    return node?.outerHTML ?? "";
};

const renderHtmlBlockFromMd = (vditor: IVditor, md: string): string => {
    const trimmed = md.trim();
    if (!trimmed) {
        return "";
    }
    const html = vditor.currentMode === "ir"
        ? vditor.lute.Md2VditorIRDOM(trimmed)
        : vditor.lute.Md2VditorDOM(trimmed);
    const temp = document.createElement("div");
    temp.innerHTML = html;
    const node = temp.querySelector('[data-type="html-block"]') as HTMLElement | null;
    return node?.outerHTML ?? "";
};

const getHtmlBlockSource = (blockElement: HTMLElement): string => {
    const mdSource = blockElement.getAttribute("data-md-source");
    if (mdSource) {
        return decodeMdSourceAttr(mdSource);
    }
    const code = blockElement.querySelector("code[data-type='html-block'], pre code") as HTMLElement | null;
    return (code?.textContent || "").replaceAll(Constants.ZWSP, "");
};

const getHtmlBlockAnchor = (blockElement: HTMLElement): HTMLElement => {
    const display = blockElement.querySelector(".vditor-html-block__display") as HTMLElement | null;
    if (display) {
        return display;
    }
    const preview = blockElement.querySelector(
        ".vditor-wysiwyg__preview, .vditor-ir__preview",
    ) as HTMLElement | null;
    return preview || blockElement;
};

const createHtmlInlineTargetWithVditor = (vditor: IVditor, element: HTMLElement): HtmlEditTarget => ({
    anchorElement: element,
    focusElement: element,
    getSource: () => decodeMdSourceAttr(element.getAttribute("data-md-source")),
    applySource: (source: string) => {
        const newHtml = renderHtmlInlineFromMd(vditor, source);
        if (newHtml) {
            const wrapper = document.createElement("div");
            wrapper.innerHTML = newHtml;
            const newNode = wrapper.firstElementChild as HTMLElement | null;
            if (!newNode) {
                return null;
            }
            element.replaceWith(newNode);
            return newNode;
        }
        element.setAttribute("data-md-source", source);
        const display = element.querySelector(".vditor-html-inline__display");
        if (display) {
            display.textContent = source;
        }
        return element;
    },
    remove: () => element.remove(),
});

const createHtmlBlockTarget = (vditor: IVditor, blockElement: HTMLElement): HtmlEditTarget => ({
    anchorElement: getHtmlBlockAnchor(blockElement),
    focusElement: blockElement,
    getSource: () => getHtmlBlockSource(blockElement),
    applySource: (source: string) => {
        const newHtml = renderHtmlBlockFromMd(vditor, source);
        if (newHtml) {
            const wrapper = document.createElement("div");
            wrapper.innerHTML = newHtml;
            const newNode = wrapper.firstElementChild as HTMLElement | null;
            if (!newNode) {
                return null;
            }
            blockElement.replaceWith(newNode);
            return newNode;
        }
        return blockElement;
    },
    remove: () => blockElement.remove(),
});

const insertLiteralTab = (view: EditorView) => {
    view.dispatch(view.state.update(view.state.replaceSelection("\t"), {
        scrollIntoView: true,
        userEvent: "input",
    }));
    return true;
};

const focusHtmlEditorAtStart = (view: EditorView) => {
    if (!view.dom.isConnected) {
        return;
    }
    view.dispatch({
        selection: { anchor: 0, head: 0 },
        scrollIntoView: false,
    });
    view.contentDOM.focus({ preventScroll: true });
};

const scheduleFocusHtmlEditorAtStart = (view: EditorView) => {
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            focusHtmlEditorAtStart(view);
        });
    });
};

const mountHtmlEditorCodeMirror = (
    host: HTMLElement,
    initialSource: string,
    onSave: () => void,
    onCancel: () => void,
) => {
    destroyHtmlEditorCodeMirror();
    const languageCompartment = new Compartment();
    const wrapCompartment = new Compartment();
    const view = new EditorView({
        doc: initialSource,
        parent: host,
        extensions: [
            vditorCodeMirrorSetup,
            languageCompartment.of([]),
            wrapCompartment.of([]),
            keymap.of(stopHandledCodeMirrorKeymap([
                { key: "Tab", run: insertLiteralTab, shift: indentLess },
                {
                    key: "Alt-Enter",
                    run: () => {
                        onSave();
                        return true;
                    },
                },
                {
                    key: "Escape",
                    run: () => {
                        onCancel();
                        return true;
                    },
                },
            ])),
            EditorView.domEventHandlers({
                mousedown: (event) => {
                    event.stopPropagation();
                    return false;
                },
            }),
        ],
    });
    activeHtmlEditorPopover = { view, languageCompartment, wrapCompartment, lineWrapEnabled: false };
    loadCodeMirrorHighlightLanguage("html").then((lang) => {
        if (!lang || activeHtmlEditorPopover?.view !== view) {
            scheduleFocusHtmlEditorAtStart(view);
            return;
        }
        view.dispatch({
            effects: languageCompartment.reconfigure(lang),
        });
        scheduleFocusHtmlEditorAtStart(view);
    });
    return view;
};

const readHtmlEditorLineWrapEnabled = (): boolean =>
    getGlobalLocalStorageSetting<boolean>(HTML_EDITOR_LINE_WRAP_KEY, false) === true;

const persistHtmlEditorLineWrapEnabled = (enabled: boolean) => {
    setGlobalLocalStorageSetting(HTML_EDITOR_LINE_WRAP_KEY, enabled);
};

const applyHtmlEditorLineWrap = (wrapButton: HTMLButtonElement, enabled: boolean) => {
    const binding = activeHtmlEditorPopover;
    if (!binding) {
        return;
    }
    binding.lineWrapEnabled = enabled;
    binding.view.dispatch({
        effects: binding.wrapCompartment.reconfigure(
            enabled ? EditorView.lineWrapping : [],
        ),
    });
    wrapButton.classList.toggle("vditor-html-inline-popover__button--wrap-active", enabled);
    wrapButton.setAttribute("aria-pressed", String(enabled));
};

const toggleHtmlEditorLineWrap = (wrapButton: HTMLButtonElement) => {
    const binding = activeHtmlEditorPopover;
    if (!binding) {
        return;
    }
    const enabled = !binding.lineWrapEnabled;
    applyHtmlEditorLineWrap(wrapButton, enabled);
    persistHtmlEditorLineWrapEnabled(enabled);
};

export const showHtmlEditorPopover = (vditor: IVditor, target: HtmlEditTarget) => {
    const popover = getModePopover(vditor);
    if (!popover || !target.anchorElement.isConnected) {
        return;
    }

    popover.classList.add(HTML_EDITOR_POPOVER_CLASS, HTML_EDITOR_PANEL_CLASS);
    popover.innerHTML = "";

    const panel = document.createElement("div");
    panel.className = "vditor-html-inline-popover";

    const cmHost = document.createElement("div");
    cmHost.className = "vditor-html-inline-popover__cm-host vditor-cm-host";

    const actions = document.createElement("div");
    actions.className = "vditor-html-inline-popover__actions";

    const hint = document.createElement("span");
    hint.className = "vditor-html-inline-popover__hint";
    hint.textContent = formatAltEnterHotkeyTip();

    const actionsButtons = document.createElement("div");
    actionsButtons.className = "vditor-html-inline-popover__actions-buttons";

    const wrapButton = document.createElement("button");
    wrapButton.type = "button";
    wrapButton.className = "vditor-html-inline-popover__button vditor-html-inline-popover__button--wrap";
    wrapButton.setAttribute("aria-label", "Toggle line wrap");
    wrapButton.setAttribute("aria-pressed", "false");
    wrapButton.innerHTML = `<span class="vditor-html-inline-popover__button-icon">${codicon("word-wrap")}</span>`;

    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.className = "vditor-html-inline-popover__button vditor-html-inline-popover__button--primary";
    saveButton.textContent = window.VditorI18n?.aiSave ?? "Save";

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "vditor-html-inline-popover__button vditor-html-inline-popover__button--cancel";
    cancelButton.textContent = window.VditorI18n?.aiCancel ?? "Cancel";

    const initialSource = target.getSource();
    const targetRef = target;

    const save = () => {
        const newMd = (activeHtmlEditorPopover?.view.state.doc.toString() ?? initialSource).trim();
        const htmlType = targetRef.anchorElement.getAttribute("data-type") === "html-block" ? "block" : "inline";
        telemetry(vditor, "markdown.html.save", { type: htmlType, isEmpty: !newMd });
        vditor.undo.addToUndoStack(vditor);
        if (!newMd) {
            const parent = targetRef.focusElement.parentElement;
            const next = targetRef.focusElement.nextSibling;
            targetRef.remove();
            notifyAfterHtmlEditorChange(vditor);
            closeHtmlEditorPopover(vditor, null, parent, next);
            return;
        }
        const focusElement = targetRef.applySource(newMd) ?? targetRef.focusElement;
        notifyAfterHtmlEditorChange(vditor);
        closeHtmlEditorPopover(vditor, focusElement);
    };

    const cancel = () => {
        closeHtmlEditorPopover(vditor, targetRef.focusElement);
    };

    saveButton.addEventListener("click", save);
    cancelButton.addEventListener("click", cancel);
    wrapButton.addEventListener("click", () => toggleHtmlEditorLineWrap(wrapButton));

    actionsButtons.appendChild(wrapButton);
    actionsButtons.appendChild(cancelButton);
    actionsButtons.appendChild(saveButton);
    actions.appendChild(hint);
    actions.appendChild(actionsButtons);
    panel.appendChild(cmHost);
    panel.appendChild(actions);
    popover.appendChild(panel);
    const view = mountHtmlEditorCodeMirror(cmHost, initialSource, save, cancel);
    applyHtmlEditorLineWrap(wrapButton, readHtmlEditorLineWrapEnabled());
    scheduleHtmlEditorPopoverPosition(vditor, target.anchorElement);
    scheduleFocusHtmlEditorAtStart(view);
};

const resolveHtmlBlockFromClick = (target: HTMLElement): HTMLElement | false => {
    const block = hasClosestByAttribute(target, "data-type", "html-block") as HTMLElement | false;
    if (!block) {
        return false;
    }
    if (block.getAttribute("contenteditable") === "false") {
        return block;
    }
    const preview = hasClosestByClassName(target, "vditor-wysiwyg__preview")
        || hasClosestByClassName(target, "vditor-ir__preview");
    if (!preview || !block.contains(preview)) {
        return false;
    }
    return block;
};

export const handleHtmlEditorClick = (
    vditor: IVditor,
    event: MouseEvent & { target: HTMLElement },
): boolean => {
    const htmlInline = hasClosestByAttribute(event.target, "data-type", "html-inline") as HTMLElement | false;
    if (htmlInline && htmlInline.getAttribute("contenteditable") === "false") {
        event.preventDefault();
        event.stopPropagation();
        showHtmlEditorPopover(vditor, createHtmlInlineTargetWithVditor(vditor, htmlInline));
        return true;
    }

    const htmlBlock = resolveHtmlBlockFromClick(event.target);
    if (htmlBlock) {
        event.preventDefault();
        event.stopPropagation();
        showHtmlEditorPopover(vditor, createHtmlBlockTarget(vditor, htmlBlock));
        return true;
    }

    return false;
};

const isReadonlyHtmlInline = (el: Element | null): el is HTMLElement =>
    !!el && el.nodeType === 1 &&
    (el as HTMLElement).getAttribute("data-type") === "html-inline" &&
    (el as HTMLElement).getAttribute("contenteditable") === "false";

const isReadonlyHtmlBlock = (el: Element | null): el is HTMLElement =>
    !!el && el.nodeType === 1 &&
    (el as HTMLElement).getAttribute("data-type") === "html-block" &&
    (el as HTMLElement).getAttribute("contenteditable") === "false";

const htmlInlineFromSibling = (node: Node | null): HTMLElement | null =>
    node?.nodeType === 1 && isReadonlyHtmlInline(node as Element) ? node as HTMLElement : null;

const htmlBlockFromSibling = (node: Node | null): HTMLElement | null =>
    node?.nodeType === 1 && isReadonlyHtmlBlock(node as Element) ? node as HTMLElement : null;

const resolveReadonlyHtmlFromRange = (
    range: Range,
    typeAttr: "html-inline" | "html-block",
    matcher: (node: Node | null) => HTMLElement | null,
): HTMLElement | null => {
    const insideResolver = (currentRange: Range) => {
        const inside = hasClosestByAttribute(currentRange.startContainer, "data-type", typeAttr) as HTMLElement | false;
        if (inside && inside.getAttribute("contenteditable") === "false") {
            return inside;
        }
        return null;
    };
    return resolveAdjacentElementFromRange(range, insideResolver, matcher);
};

const resolveReadonlyHtmlInlineFromRange = (range: Range): HTMLElement | null =>
    resolveReadonlyHtmlFromRange(range, "html-inline", htmlInlineFromSibling);

const resolveReadonlyHtmlBlockFromRange = (range: Range): HTMLElement | null =>
    resolveReadonlyHtmlFromRange(range, "html-block", htmlBlockFromSibling);

export const handleHtmlEditorAltEnter = (vditor: IVditor, range: Range): boolean => {
    const popover = getModePopover(vditor);
    if (popover?.classList.contains(HTML_EDITOR_PANEL_CLASS) && popover.style.display !== "none") {
        return false;
    }

    const htmlInline = resolveReadonlyHtmlInlineFromRange(range);
    if (htmlInline) {
        showHtmlEditorPopover(vditor, createHtmlInlineTargetWithVditor(vditor, htmlInline));
        return true;
    }

    const htmlBlock = resolveReadonlyHtmlBlockFromRange(range);
    if (htmlBlock) {
        showHtmlEditorPopover(vditor, createHtmlBlockTarget(vditor, htmlBlock));
        return true;
    }

    return false;
};

/** @deprecated use handleHtmlEditorClick */
export const handleHtmlInlineClick = handleHtmlEditorClick;

export const showHtmlInlinePopover = (vditor: IVditor, htmlInlineElement: HTMLElement) => {
    showHtmlEditorPopover(vditor, createHtmlInlineTargetWithVditor(vditor, htmlInlineElement));
};
