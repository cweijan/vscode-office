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
import { renderHtmlInlineFromMd } from "./renderHtmlInline";
import { renderHtmlBlockFromMd } from "./renderHtmlBlock";
import { FONT_COLOR_PALETTE, isValidFontColor } from "../ui/fontColorPanel";
import { isValidBackgroundColor } from "../ui/backgroundColorPanel";

const HTML_EDITOR_POPOVER_CLASS = "vditor-popover--html-inline";
const HTML_EDITOR_PANEL_CLASS = "vditor-panel--html-inline";
const POPOVER_INSET = 8;
const VIEWPORT_MARGIN = 12;
const MD_SOURCE_ESC_NEWLINE = "_esc_newline_";
const FALLBACK_FONT_COLOR = "#000000";
const FALLBACK_BACKGROUND_COLOR = "#fff2cc";
const FALLBACK_FONT_SIZE = 16;
const HTML_INLINE_PREVIEW_TEXT = "Preview";

const decodeMdSourceAttr = (raw: string | null): string => {
    if (!raw) {
        return "";
    }
    return raw.replaceAll(MD_SOURCE_ESC_NEWLINE, "\n");
};

const isSpanHtmlInlineSource = (source: string): boolean => {
    const trimmed = source.trim();
    if (!/^<span\b/i.test(trimmed)) {
        return false;
    }
    const temp = document.createElement("div");
    temp.innerHTML = trimmed;
    return temp.childNodes.length === 1 && temp.firstElementChild?.tagName === "SPAN";
};

const extractSpanInnerText = (source: string): string => {
    const temp = document.createElement("div");
    temp.innerHTML = source.trim();
    return temp.querySelector("span")?.textContent ?? "";
};

const normalizeCssColorToHex = (value: string): string | null => {
    const raw = value.trim().toLowerCase();
    if (!raw) {
        return null;
    }
    if (/^#([0-9a-f]{6})$/.test(raw)) {
        return raw;
    }
    if (/^#([0-9a-f]{3})$/.test(raw)) {
        return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`;
    }
    const rgbMatch = raw.match(/^rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (!rgbMatch) {
        return null;
    }
    const channels = rgbMatch.slice(1, 4).map((item) => Number(item));
    if (channels.some((channel) => !Number.isInteger(channel) || channel < 0 || channel > 255)) {
        return null;
    }
    return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
};

const readSpanStyleColor = (
    source: string,
    property: "color" | "backgroundColor",
): string | null => {
    const temp = document.createElement("div");
    temp.innerHTML = source.trim();
    const span = temp.querySelector("span");
    if (!span) {
        return null;
    }
    const inlineRaw = span.style[property]?.trim();
    if (inlineRaw) {
        const normalized = normalizeCssColorToHex(inlineRaw);
        if (normalized) {
            return normalized;
        }
    }
    const styleAttr = span.getAttribute("style") || "";
    const cssProperty = property === "backgroundColor" ? "background-color" : "color";
    const declarations = styleAttr.split(";")
        .map((item) => item.trim())
        .filter(Boolean);
    const declaration = declarations.find((item) => {
        const [name] = item.split(":");
        return name?.trim().toLowerCase() === cssProperty;
    });
    if (!declaration) {
        return null;
    }
    const value = declaration.slice(declaration.indexOf(":") + 1);
    return normalizeCssColorToHex(value);
};

const readSpanStyleFontSize = (source: string): number | null => {
    const temp = document.createElement("div");
    temp.innerHTML = source.trim();
    const span = temp.querySelector("span");
    if (!span) {
        return null;
    }
    const raw = span.style.fontSize?.trim();
    if (!raw) {
        return null;
    }
    const match = raw.match(/^(\d+(?:\.\d+)?)px$/i);
    if (!match) {
        return null;
    }
    const value = Number(match[1]);
    return Number.isFinite(value) ? value : null;
};

const updateSpanStyleColor = (
    source: string,
    property: "color" | "backgroundColor",
    value: string,
): string => {
    const temp = document.createElement("div");
    temp.innerHTML = source.trim();
    const span = temp.querySelector("span");
    if (!span) {
        return source;
    }
    span.style[property] = value;
    return span.outerHTML;
};

const updateSpanStyleFontSize = (source: string, value: number): string => {
    const temp = document.createElement("div");
    temp.innerHTML = source.trim();
    const span = temp.querySelector("span");
    if (!span) {
        return source;
    }
    span.style.fontSize = `${value}px`;
    return span.outerHTML;
};

const getPreviewForegroundColor = (color: string): string => {
    const normalized = color.length === 4
        ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
        : color;
    const red = Number.parseInt(normalized.slice(1, 3), 16);
    const green = Number.parseInt(normalized.slice(3, 5), 16);
    const blue = Number.parseInt(normalized.slice(5, 7), 16);
    const luminance = (red * 299 + green * 587 + blue * 114) / 1000;
    return luminance >= 160 ? "#111111" : "#ffffff";
};

const getHtmlEditorThemeColors = (vditor: IVditor, anchorElement: HTMLElement) => {
    const editorElement = getModeEditorElement(vditor);
    const source = editorElement || anchorElement.closest(".vditor") as HTMLElement | null || anchorElement;
    const computed = window.getComputedStyle(source);
    const textColor = normalizeCssColorToHex(computed.color) ?? FALLBACK_FONT_COLOR;
    const backgroundColor = normalizeCssColorToHex(computed.backgroundColor)
        ?? normalizeCssColorToHex(computed.getPropertyValue("--textarea-background-color"))
        ?? normalizeCssColorToHex(computed.getPropertyValue("--panel-background-color"))
        ?? FALLBACK_BACKGROUND_COLOR;
    return { textColor, backgroundColor };
};

const clearSpanHtmlInline = (vditor: IVditor, target: HtmlEditTarget, mdSource: string) => {
    const plainText = extractSpanInnerText(mdSource);
    const element = target.focusElement;
    const parent = element.parentElement;
    const next = element.nextSibling;
    element.replaceWith(document.createTextNode(plainText));
    notifyAfterHtmlEditorChange(vditor);
    closeHtmlEditorPopover(vditor, null, parent, next);
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

type HtmlColorFeature = "font-color" | "background-color";

let activeHtmlEditorPopover: HtmlEditorPopoverBinding | null = null;
let activeHtmlColorConfigPopover: HTMLElement | null = null;
let activeHtmlColorConfigDismiss: ((event: MouseEvent) => void) | null = null;
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

const hideHtmlColorConfigPopover = () => {
    if (activeHtmlColorConfigDismiss) {
        document.removeEventListener("mousedown", activeHtmlColorConfigDismiss, true);
        activeHtmlColorConfigDismiss = null;
    }
    if (activeHtmlColorConfigPopover) {
        activeHtmlColorConfigPopover.remove();
        activeHtmlColorConfigPopover = null;
    }
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
    hideHtmlColorConfigPopover();
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
    if (element?.tagName === "DIV") {
        return;
    }
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

const updateHtmlEditorSource = (nextSource: string) => {
    const binding = activeHtmlEditorPopover;
    if (!binding) {
        return;
    }
    const view = binding.view;
    view.dispatch({
        changes: {
            from: 0,
            to: view.state.doc.length,
            insert: nextSource,
        },
    });
};

const bindLockedPopoverControl = (
    vditor: IVditor,
    feature: "html-inline-font-color" | "html-inline-background-color" | "html-inline-font-size",
) => {
    return (event: Event) => {
        event.preventDefault();
        event.stopPropagation();
        telemetry(vditor, "markdown.proRequired", { feature });
        vditor.options.onRequirePro?.(feature);
    };
};

const updateColorPreview = (
    preview: HTMLElement,
    text: string,
    color: string | null,
    backgroundColor: string | null,
) => {
    preview.textContent = text || HTML_INLINE_PREVIEW_TEXT;
    preview.style.color = color || "";
    preview.style.backgroundColor = backgroundColor || "";
    if (!color && backgroundColor) {
        preview.style.color = getPreviewForegroundColor(backgroundColor);
    }
};

const createColorPaletteButtons = (
    selectedClass: string,
    selectedColor: string,
) => FONT_COLOR_PALETTE.map((color) => {
    const currentClass = color === selectedColor ? ` ${selectedClass}` : "";
    return `<button type="button" class="vditor-html-inline-color-config-popover__swatch${currentClass}" data-color="${color}" `
        + `style="background-color:${color}" aria-label="${color}" title="${color}"></button>`;
}).join("");

const updateColorConfigCurrentSwatch = (grid: HTMLElement, color: string) => {
    grid.querySelectorAll("button[data-color]").forEach((button) => {
        button.classList.toggle("vditor-html-inline-color-config-popover__swatch--current",
            (button as HTMLElement).getAttribute("data-color") === color);
    });
};

const positionHtmlColorConfigPopover = (popover: HTMLElement, anchorElement: HTMLElement) => {
    const rect = anchorElement.getBoundingClientRect();
    const margin = 12;
    const inset = 8;
    let top = rect.bottom + inset;
    let left = rect.left;
    const width = popover.offsetWidth;
    const height = popover.offsetHeight;
    if (left + width > window.innerWidth - margin) {
        left = window.innerWidth - width - margin;
    }
    if (left < margin) {
        left = margin;
    }
    if (top + height > window.innerHeight - margin) {
        const above = rect.top - height - inset;
        top = above >= margin ? above : Math.max(margin, window.innerHeight - height - margin);
    }
    popover.style.left = `${Math.round(left)}px`;
    popover.style.top = `${Math.round(top)}px`;
};

const applyHtmlColorConfigThemeVars = (popover: HTMLElement, anchorElement: HTMLElement) => {
    const root = anchorElement.closest(".vditor") as HTMLElement | null;
    const source = root || anchorElement;
    const computed = window.getComputedStyle(source);
    [
        "--panel-background-color",
        "--textarea-background-color",
        "--textarea-text-color",
        "--toolbar-icon-color",
        "--link-color",
        "--vditor-popover-primary-btn-bg",
        "--vditor-popover-primary-btn-bg-hover",
        "--vditor-popover-primary-btn-fg",
    ].forEach((name) => {
        const value = computed.getPropertyValue(name).trim();
        if (value) {
            popover.style.setProperty(name, value);
        }
    });
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

    const actionsLeft = document.createElement("div");
    actionsLeft.className = "vditor-html-inline-popover__actions-left";

    const actionsRight = document.createElement("div");
    actionsRight.className = "vditor-html-inline-popover__actions-right";

    const hint = document.createElement("span");
    hint.className = "vditor-html-inline-popover__hint";
    hint.textContent = formatAltEnterHotkeyTip();

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

    const spanColorControls = document.createElement("div");
    spanColorControls.className = "vditor-html-inline-popover__span-controls";

    const initialSource = target.getSource();
    const targetRef = target;

    const dismiss = () => {
        closeHtmlEditorPopover(vditor, targetRef.focusElement);
    };

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

    saveButton.addEventListener("click", save);
    wrapButton.addEventListener("click", () => toggleHtmlEditorLineWrap(wrapButton));

    actionsLeft.appendChild(hint);
    actionsLeft.appendChild(wrapButton);

    if (isSpanHtmlInlineSource(initialSource)) {
        const previewText = extractSpanInnerText(initialSource).replace(/\s+/g, " ").trim();
        const themeColors = getHtmlEditorThemeColors(vditor, target.anchorElement);
        const initialFontColor = readSpanStyleColor(initialSource, "color");
        const initialBackgroundColor = readSpanStyleColor(initialSource, "backgroundColor");
        let currentFontColor = initialFontColor ?? themeColors.textColor;
        let currentBackgroundColor = initialBackgroundColor ?? themeColors.backgroundColor;
        let currentPreviewText = previewText;
        const openColorConfig = (
            feature: HtmlColorFeature,
            anchorElement: HTMLElement,
            syncInput: (color: string) => void,
        ) => {
            hideHtmlColorConfigPopover();
            const popover = document.createElement("div");
            popover.className = "vditor-html-inline-color-config-popover";
            const preview = document.createElement("div");
            preview.className = "vditor-html-inline-color-config-popover__preview";
            updateColorPreview(preview, currentPreviewText, currentFontColor, currentBackgroundColor);
            const grid = document.createElement("div");
            grid.className = "vditor-html-inline-color-config-popover__grid";
            const currentColor = feature === "font-color"
                ? currentFontColor
                : currentBackgroundColor;
            grid.innerHTML = createColorPaletteButtons("vditor-html-inline-color-config-popover__swatch--current", currentColor);
            const actions = document.createElement("div");
            actions.className = "vditor-html-inline-color-config-popover__actions";
            const label = document.createElement("span");
            label.className = "vditor-html-inline-color-config-popover__label";
            label.textContent = "Color";
            const input = document.createElement("input");
            input.type = "color";
            input.className = "vditor-html-inline-color-config-popover__input";
            input.value = currentColor;
            const confirm = document.createElement("button");
            confirm.type = "button";
            confirm.className = "vditor-html-inline-color-config-popover__confirm";
            confirm.textContent = window.VditorI18n.confirm || "Confirm";
            if (!vditor.options.isPro) {
                confirm.insertAdjacentHTML("beforeend", `<span class="vditor-pro-locked__badge" aria-hidden="true">PRO</span>`);
                confirm.classList.add("vditor-pro-locked");
            }
            const syncPendingColor = (color: string) => {
                if (feature === "font-color") {
                    if (!isValidFontColor(color)) {
                        return;
                    }
                    currentFontColor = color;
                } else {
                    if (!isValidBackgroundColor(color)) {
                        return;
                    }
                    currentBackgroundColor = color;
                }
                input.value = color;
                updateColorConfigCurrentSwatch(grid, color);
                updateColorPreview(preview, currentPreviewText, currentFontColor, currentBackgroundColor);
            };
            grid.addEventListener("click", (event) => {
                const swatch = (event.target as HTMLElement).closest("button[data-color]") as HTMLButtonElement | null;
                if (!swatch) {
                    return;
                }
                event.preventDefault();
                event.stopPropagation();
                syncPendingColor(swatch.getAttribute("data-color") || "");
            });
            input.addEventListener("input", () => syncPendingColor(input.value));
            confirm.addEventListener("click", !vditor.options.isPro
                ? bindLockedPopoverControl(vditor, feature === "font-color" ? "html-inline-font-color" : "html-inline-background-color")
                : () => {
                    const currentSource = activeHtmlEditorPopover?.view.state.doc.toString() ?? initialSource;
                    const nextSource = feature === "font-color"
                        ? updateSpanStyleColor(currentSource, "color", input.value)
                        : updateSpanStyleColor(currentSource, "backgroundColor", input.value);
                    updateHtmlEditorSource(nextSource);
                    syncInput(input.value);
                    hideHtmlColorConfigPopover();
                });
            actions.appendChild(label);
            actions.appendChild(input);
            actions.appendChild(confirm);
            popover.appendChild(preview);
            popover.appendChild(grid);
            popover.appendChild(actions);
            applyHtmlColorConfigThemeVars(popover, anchorElement);
            document.body.appendChild(popover);
            positionHtmlColorConfigPopover(popover, anchorElement);
            activeHtmlColorConfigPopover = popover;
            activeHtmlColorConfigDismiss = (event: MouseEvent) => {
                const target = event.target as Node | null;
                if (target && (popover.contains(target) || anchorElement.contains(target))) {
                    return;
                }
                hideHtmlColorConfigPopover();
            };
            document.addEventListener("mousedown", activeHtmlColorConfigDismiss, true);
        };

        const fontColorLabel = document.createElement("label");
        fontColorLabel.className = "vditor-html-inline-popover__color-control";
        fontColorLabel.innerHTML = `<span class="vditor-html-inline-popover__color-label">${window.VditorI18n?.["font-color"] || "Font color"}</span>`;
        const fontColorInput = document.createElement("input");
        fontColorInput.type = "color";
        fontColorInput.className = "vditor-html-inline-popover__color-input";
        fontColorInput.value = currentFontColor;
        const syncFontInput = (color: string) => {
            currentFontColor = color;
            fontColorInput.value = color;
            currentPreviewText = extractSpanInnerText(activeHtmlEditorPopover?.view.state.doc.toString() ?? initialSource).replace(/\s+/g, " ").trim();
        };
        const openFontColorConfig = (event: Event) => {
            event.preventDefault();
            event.stopPropagation();
            openColorConfig("font-color", fontColorInput, syncFontInput);
        };
        fontColorInput.addEventListener("click", openFontColorConfig);
        fontColorLabel.addEventListener("click", openFontColorConfig);
        fontColorLabel.appendChild(fontColorInput);

        const backgroundColorLabel = document.createElement("label");
        backgroundColorLabel.className = "vditor-html-inline-popover__color-control";
        backgroundColorLabel.innerHTML = `<span class="vditor-html-inline-popover__color-label">${window.VditorI18n?.["background-color"] || "Background color"}</span>`;
        const backgroundColorInput = document.createElement("input");
        backgroundColorInput.type = "color";
        backgroundColorInput.className = "vditor-html-inline-popover__color-input";
        backgroundColorInput.value = currentBackgroundColor;
        const syncBackgroundInput = (color: string) => {
            currentBackgroundColor = color;
            backgroundColorInput.value = color;
            currentPreviewText = extractSpanInnerText(activeHtmlEditorPopover?.view.state.doc.toString() ?? initialSource).replace(/\s+/g, " ").trim();
        };
        const openBackgroundColorConfig = (event: Event) => {
            event.preventDefault();
            event.stopPropagation();
            openColorConfig("background-color", backgroundColorInput, syncBackgroundInput);
        };
        backgroundColorInput.addEventListener("click", openBackgroundColorConfig);
        backgroundColorLabel.addEventListener("click", openBackgroundColorConfig);
        backgroundColorLabel.appendChild(backgroundColorInput);
        spanColorControls.appendChild(fontColorLabel);
        spanColorControls.appendChild(backgroundColorLabel);

        const fontSizeLabel = document.createElement("label");
        fontSizeLabel.className = "vditor-html-inline-popover__color-control";
        fontSizeLabel.innerHTML = `<span class="vditor-html-inline-popover__color-label">${window.VditorI18n?.["font-size"] || "Font size"}</span>`;
        const fontSizeInput = document.createElement("input");
        fontSizeInput.type = "number";
        fontSizeInput.className = "vditor-html-inline-popover__size-input";
        fontSizeInput.min = "8";
        fontSizeInput.max = "96";
        fontSizeInput.step = "1";
        fontSizeInput.value = String(readSpanStyleFontSize(initialSource) ?? FALLBACK_FONT_SIZE);
        if (!vditor.options.isPro) {
            fontSizeInput.disabled = true;
            fontSizeLabel.classList.add("vditor-pro-locked", "vditor-html-inline-popover__color-control--locked");
            fontSizeLabel.insertAdjacentHTML("beforeend", `<span class="vditor-pro-locked__badge" aria-hidden="true">PRO</span>`);
            fontSizeLabel.addEventListener("click", bindLockedPopoverControl(vditor, "html-inline-font-size"));
        } else {
            fontSizeInput.addEventListener("input", () => {
                const nextValue = Number(fontSizeInput.value);
                if (!Number.isFinite(nextValue) || nextValue < 8 || nextValue > 96) {
                    return;
                }
                updateHtmlEditorSource(updateSpanStyleFontSize(
                    activeHtmlEditorPopover?.view.state.doc.toString() ?? initialSource,
                    nextValue,
                ));
            });
        }
        fontSizeLabel.appendChild(fontSizeInput);
        spanColorControls.appendChild(fontSizeLabel);
    }

    if (isSpanHtmlInlineSource(initialSource)) {
        const clearLabel = window.VditorI18n?.["html-clear-format"] ?? "Clear";
        const clearButton = document.createElement("button");
        clearButton.type = "button";
        clearButton.className = "vditor-html-inline-popover__button vditor-html-inline-popover__button--clear";
        clearButton.setAttribute("aria-label", clearLabel);
        clearButton.title = clearLabel;
        clearButton.innerHTML = `<span class="vditor-html-inline-popover__button-icon">${codicon("eraser")}</span>`;
        clearButton.addEventListener("click", () => {
            vditor.undo.addToUndoStack(vditor);
            telemetry(vditor, "markdown.html.clearSpan");
            clearSpanHtmlInline(vditor, targetRef, initialSource);
        });
        actionsLeft.appendChild(clearButton);
    }

    actionsRight.appendChild(saveButton);
    actions.appendChild(actionsLeft);
    actions.appendChild(actionsRight);
    panel.appendChild(cmHost);
    if (spanColorControls.childElementCount > 0) {
        panel.appendChild(spanColorControls);
    }
    panel.appendChild(actions);
    popover.appendChild(panel);
    const view = mountHtmlEditorCodeMirror(cmHost, initialSource, save, dismiss);
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
