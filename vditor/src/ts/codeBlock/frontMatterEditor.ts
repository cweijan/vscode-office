import { indentLess } from "@codemirror/commands";
import { Compartment } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";

import { getModeEditorElement, getModePopover } from "./codeBlockLanguagePopover";
import { loadCodeMirrorHighlightLanguage } from "./codeBlockHighlightLanguages";
import { stopHandledCodeMirrorKeymap, vditorCodeMirrorSetup } from "./codeMirrorSetup";
import { processAfterRender } from "../ir/process";
import { formatAltEnterHotkeyTip } from "../util/compatibility";
import { afterRenderEvent } from "../wysiwyg/afterRenderEvent";

const FRONT_MATTER_POPOVER_CLASS = "vditor-popover--front-matter";
const FRONT_MATTER_PANEL_CLASS = "vditor-panel--front-matter";
const POPOVER_INSET = 8;
const VIEWPORT_MARGIN = 12;

type FrontMatterPopoverBinding = {
    view: EditorView;
    languageCompartment: Compartment;
    blockElement: HTMLElement;
};

let activeFrontMatterPopover: FrontMatterPopoverBinding | null = null;
let positionAnchor: HTMLElement | null = null;
let positionVditor: IVditor | null = null;
let scrollRepositionHandler: (() => void) | null = null;

const getModeEditor = (vditor: IVditor) => {
    if (vditor.currentMode === "wysiwyg") {
        return vditor.wysiwyg.element;
    }
    if (vditor.currentMode === "ir") {
        return vditor.ir.element;
    }
    return null;
};

const getYamlSourceFromBlock = (blockElement: HTMLElement) => {
    const code = blockElement.querySelector("code[data-type='yaml-front-matter']") as HTMLElement | null;
    return (code?.textContent || "").trimEnd();
};

const spinFrontMatterBlock = (vditor: IVditor, blockElement: HTMLElement) => {
    const html = vditor.currentMode === "ir"
        ? vditor.lute.SpinVditorIRDOM(blockElement.outerHTML)
        : vditor.lute.SpinVditorDOM(blockElement.outerHTML);
    blockElement.outerHTML = html;
    return getModeEditor(vditor)?.querySelector("[data-type='yaml-front-matter']") as HTMLElement | null;
};

const notifyAfterFrontMatterChange = (vditor: IVditor) => {
    if (vditor.currentMode === "ir") {
        processAfterRender(vditor);
        return;
    }
    afterRenderEvent(vditor);
};

const destroyFrontMatterCodeMirror = () => {
    if (!activeFrontMatterPopover) {
        return;
    }
    activeFrontMatterPopover.view.destroy();
    activeFrontMatterPopover = null;
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

const clampFrontMatterPopoverPosition = (vditor: IVditor, anchorElement: HTMLElement) => {
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
    let viewportLeft = anchorRect.right - popoverWidth;

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
};

const attachPopoverReposition = (vditor: IVditor, anchorElement: HTMLElement) => {
    detachPopoverReposition();
    positionAnchor = anchorElement;
    positionVditor = vditor;
    scrollRepositionHandler = () => {
        if (positionAnchor?.isConnected && positionVditor) {
            const editorElement = getModeEditorElement(positionVditor);
            if (!editorElement || !isAnchorVisible(editorElement, positionAnchor)) {
                hideFrontMatterEditorPopover(positionVditor);
                return;
            }
            clampFrontMatterPopoverPosition(positionVditor, positionAnchor);
        }
    };
    window.addEventListener("scroll", scrollRepositionHandler, true);
    getModeEditorElement(vditor)?.addEventListener("scroll", scrollRepositionHandler);
};

const scheduleFrontMatterPopoverPosition = (vditor: IVditor, anchorElement: HTMLElement) => {
    requestAnimationFrame(() => {
        if (!anchorElement.isConnected) {
            return;
        }
        clampFrontMatterPopoverPosition(vditor, anchorElement);
        attachPopoverReposition(vditor, anchorElement);
    });
};

const hideFrontMatterEditorPopover = (vditor: IVditor) => {
    const popover = getModePopover(vditor);
    if (!popover) {
        return;
    }
    detachPopoverReposition();
    destroyFrontMatterCodeMirror();
    popover.style.position = "";
    popover.style.display = "none";
    popover.classList.remove(FRONT_MATTER_POPOVER_CLASS, FRONT_MATTER_PANEL_CLASS);
    popover.innerHTML = "";
};

const insertLiteralTab = (view: EditorView) => {
    view.dispatch(view.state.update(view.state.replaceSelection("\t"), {
        scrollIntoView: true,
        userEvent: "input",
    }));
    return true;
};

const focusFrontMatterEditorAtStart = (view: EditorView) => {
    if (!view.dom.isConnected) {
        return;
    }
    view.dispatch({
        selection: { anchor: 0, head: 0 },
        scrollIntoView: false,
    });
    view.contentDOM.focus({ preventScroll: true });
};

const scheduleFocusFrontMatterEditorAtStart = (view: EditorView) => {
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            focusFrontMatterEditorAtStart(view);
        });
    });
};

const mountFrontMatterCodeMirror = (
    host: HTMLElement,
    blockElement: HTMLElement,
    initialSource: string,
    onSave: () => void,
    onCancel: () => void,
) => {
    destroyFrontMatterCodeMirror();
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
    activeFrontMatterPopover = { view, languageCompartment, blockElement };
    loadCodeMirrorHighlightLanguage("yaml").then((lang) => {
        if (!lang || activeFrontMatterPopover?.view !== view) {
            scheduleFocusFrontMatterEditorAtStart(view);
            return;
        }
        view.dispatch({
            effects: languageCompartment.reconfigure(lang),
        });
        scheduleFocusFrontMatterEditorAtStart(view);
    });
    return view;
};

const applyYamlToBlock = (vditor: IVditor, blockElement: HTMLElement, yaml: string) => {
    const syncCode = blockElement.querySelector("code[data-type='yaml-front-matter']") as HTMLElement | null;
    if (syncCode) {
        syncCode.textContent = yaml;
    }
    return spinFrontMatterBlock(vditor, blockElement);
};

export const showFrontMatterEditorPopover = (vditor: IVditor, blockElement: HTMLElement) => {
    const popover = getModePopover(vditor);
    const editButton = blockElement.querySelector(".vditor-properties__edit") as HTMLElement | null;
    const anchorElement = editButton || blockElement;
    if (!popover || !blockElement.isConnected) {
        return;
    }

    popover.classList.add(FRONT_MATTER_POPOVER_CLASS, FRONT_MATTER_PANEL_CLASS);
    popover.innerHTML = "";

    const panel = document.createElement("div");
    panel.className = "vditor-html-inline-popover vditor-front-matter-popover";

    const cmHost = document.createElement("div");
    cmHost.className = "vditor-html-inline-popover__cm-host vditor-cm-host";

    const actions = document.createElement("div");
    actions.className = "vditor-html-inline-popover__actions";

    const hint = document.createElement("span");
    hint.className = "vditor-html-inline-popover__hint";
    hint.textContent = formatAltEnterHotkeyTip();

    const actionsButtons = document.createElement("div");
    actionsButtons.className = "vditor-html-inline-popover__actions-buttons";

    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.className = "vditor-html-inline-popover__button vditor-html-inline-popover__button--primary";
    saveButton.textContent = window.VditorI18n?.aiSave ?? "Save";

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "vditor-html-inline-popover__button vditor-html-inline-popover__button--cancel";
    cancelButton.textContent = window.VditorI18n?.aiCancel ?? "Cancel";

    const initialSource = getYamlSourceFromBlock(blockElement);
    const blockRef = blockElement;

    const save = () => {
        const yaml = (activeFrontMatterPopover?.view.state.doc.toString() ?? initialSource).trimEnd();
        vditor.undo.addToUndoStack(vditor);
        applyYamlToBlock(vditor, blockRef, yaml);
        notifyAfterFrontMatterChange(vditor);
        hideFrontMatterEditorPopover(vditor);
    };

    const cancel = () => {
        hideFrontMatterEditorPopover(vditor);
    };

    saveButton.addEventListener("click", save);
    cancelButton.addEventListener("click", cancel);

    actionsButtons.appendChild(cancelButton);
    actionsButtons.appendChild(saveButton);
    actions.appendChild(hint);
    actions.appendChild(actionsButtons);
    panel.appendChild(cmHost);
    panel.appendChild(actions);
    popover.appendChild(panel);
    mountFrontMatterCodeMirror(cmHost, blockRef, initialSource, save, cancel);
    scheduleFrontMatterPopoverPosition(vditor, anchorElement);
};

export const handleFrontMatterEditorClick = (
    vditor: IVditor,
    event: MouseEvent & { target: HTMLElement },
): boolean => {
    const editButton = event.target.closest(".vditor-properties__edit") as HTMLElement | null;
    if (!editButton) {
        return false;
    }
    const blockElement = editButton.closest("[data-type='yaml-front-matter']") as HTMLElement | null;
    if (!blockElement) {
        return false;
    }
    event.preventDefault();
    event.stopPropagation();
    showFrontMatterEditorPopover(vditor, blockElement);
    return true;
};

/** @deprecated inline YAML editor removed; kept for renderCodeBlocks compatibility */
export const setupFrontMatterYamlEditors = (_vditor: IVditor) => {
};

export const flushFrontMatterYamlToSyncCode = (vditor: IVditor) => {
    if (!activeFrontMatterPopover) {
        return;
    }
    const { blockElement, view } = activeFrontMatterPopover;
    const syncCode = blockElement.querySelector("code[data-type='yaml-front-matter']") as HTMLElement | null;
    if (syncCode) {
        syncCode.textContent = view.state.doc.toString();
    }
    hideFrontMatterEditorPopover(vditor);
};

export const isFrontMatterYamlCmFocused = () => {
    return !!activeFrontMatterPopover?.view.hasFocus;
};
