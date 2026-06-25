import { indentLess } from "@codemirror/commands";
import { Compartment } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";

import { getModeEditorElement, getModePopover } from "../codeBlock/codeBlockLanguagePopover";
import { loadCodeMirrorHighlightLanguage } from "../codeBlock/codeBlockHighlightLanguages";
import { stopHandledCodeMirrorKeymap, vditorCodeMirrorSetup } from "../codeBlock/codeMirrorSetup";
import { Constants } from "../constants";
import { hasClosestByAttribute, hasClosestByClassName } from "../util/hasClosest";
import { afterRenderEvent } from "../wysiwyg/afterRenderEvent";
import { processAfterRender } from "../ir/process";

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
    getSource: () => string;
    applySource: (source: string) => void;
    remove: () => void;
};

type HtmlEditorPopoverBinding = {
    view: EditorView;
    languageCompartment: Compartment;
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
    popover.style.display = "none";
    popover.classList.remove(HTML_EDITOR_POPOVER_CLASS, HTML_EDITOR_PANEL_CLASS);
    popover.innerHTML = "";
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
    getSource: () => decodeMdSourceAttr(element.getAttribute("data-md-source")),
    applySource: (source: string) => {
        const newHtml = renderHtmlInlineFromMd(vditor, source);
        if (newHtml) {
            element.outerHTML = newHtml;
            return;
        }
        element.setAttribute("data-md-source", source);
        const display = element.querySelector(".vditor-html-inline__display");
        if (display) {
            display.textContent = source;
        }
    },
    remove: () => element.remove(),
});

const createHtmlBlockTarget = (vditor: IVditor, blockElement: HTMLElement): HtmlEditTarget => ({
    anchorElement: getHtmlBlockAnchor(blockElement),
    getSource: () => getHtmlBlockSource(blockElement),
    applySource: (source: string) => {
        const newHtml = renderHtmlBlockFromMd(vditor, source);
        if (newHtml) {
            blockElement.outerHTML = newHtml;
        }
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
    const view = new EditorView({
        doc: initialSource,
        parent: host,
        extensions: [
            vditorCodeMirrorSetup,
            languageCompartment.of([]),
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
    activeHtmlEditorPopover = { view, languageCompartment };
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

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "vditor-html-inline-popover__button vditor-html-inline-popover__button--cancel";
    cancelButton.textContent = "Cancel";

    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.className = "vditor-html-inline-popover__button vditor-html-inline-popover__button--primary";
    saveButton.textContent = "Save";

    const initialSource = target.getSource();
    const targetRef = target;

    const save = () => {
        const newMd = (activeHtmlEditorPopover?.view.state.doc.toString() ?? initialSource).trim();
        vditor.undo.addToUndoStack(vditor);
        if (!newMd) {
            targetRef.remove();
        } else {
            targetRef.applySource(newMd);
        }
        hideHtmlEditorPopover(vditor);
        notifyAfterHtmlEditorChange(vditor);
    };

    const cancel = () => {
        hideHtmlEditorPopover(vditor);
    };

    cancelButton.addEventListener("click", cancel);
    saveButton.addEventListener("click", save);

    actions.appendChild(cancelButton);
    actions.appendChild(saveButton);
    panel.appendChild(cmHost);
    panel.appendChild(actions);
    popover.appendChild(panel);
    const view = mountHtmlEditorCodeMirror(cmHost, initialSource, save, cancel);
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

/** @deprecated use handleHtmlEditorClick */
export const handleHtmlInlineClick = handleHtmlEditorClick;

export const showHtmlInlinePopover = (vditor: IVditor, htmlInlineElement: HTMLElement) => {
    showHtmlEditorPopover(vditor, createHtmlInlineTargetWithVditor(vditor, htmlInlineElement));
};
