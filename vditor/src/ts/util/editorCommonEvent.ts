import { Constants } from "../constants";
import { isInsideCodeBlockChrome, isInsideCodeMirror, isPlantumlRenderImage } from "../codeBlock/codeMirrorManager";
import { processHeading } from "../ir/process";
import { processKeydown as irProcessKeydown } from "../ir/processKeydown";
import { getMarkdown } from "../markdown/getMarkdown";
import { previewImage } from "../preview/image";
import { setEditMode } from "../toolbar/EditMode";
import { hidePanel } from "../toolbar/setToolbar";
import { afterRenderEvent, handlerHistoryEvent } from "../wysiwyg/afterRenderEvent";
import { exitLinkPopoverToElement, hideLinkPopover } from "../wysiwyg/highlightToolbarWYSIWYG";
import { processKeydown } from "../wysiwyg/processKeydown";
import { removeHeading, setHeading } from "../wysiwyg/setHeading";
import { getEventName, isCtrl } from "./compatibility";
import { shouldBlockMacOptionSymbol } from "./macOptionSymbol";
import { copyTextCutBlock, removeTextCutBlock, resolveTextCutBlock } from "./cutEmptySelection";
import { execAfterRender, paste } from "./fixBrowserBehavior";
import { insertPastedCode } from "./processCode";
import { getSelectText } from "./getSelectText";
import { hasClosestByAttribute, hasClosestByMatchTag } from "./hasClosest";
import { matchHotKey } from "./hotKey";
import { getEditorRange } from "./selection";
import { saveCacheFocus } from "./cacheFocus";
import { clearActiveHeadingMarker } from "./updateActiveHeadingMarker";
import { handleAutoSymbolPair } from "./autoSymbol";
import { handleVscodeShortcut } from "./vscodeShortcut";
import { telemetry } from "./telemetry";
import { codicon } from "./codicon";

const IMAGE_RESIZE_MIN_DIMENSION = 24;

const markImageLoading = (img: HTMLImageElement) => {
    if (img.complete && img.naturalWidth > 0) {
        return;
    }
    img.setAttribute("data-loading", "");
    const clear = () => img.removeAttribute("data-loading");
    img.addEventListener("load", clear, { once: true });
    img.addEventListener("error", clear, { once: true });
};

export const bindImageLoadingState = (editorElement: HTMLElement) => {
    editorElement.querySelectorAll<HTMLImageElement>("img").forEach(markImageLoading);

    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType !== Node.ELEMENT_NODE) {
                    return;
                }
                const el = node as HTMLElement;
                if (el.tagName === "IMG") {
                    markImageLoading(el as HTMLImageElement);
                } else {
                    el.querySelectorAll<HTMLImageElement>("img").forEach(markImageLoading);
                }
            });
        }
    });
    observer.observe(editorElement, { childList: true, subtree: true });
};

const resolveEditableHoverImage = (vditor: IVditor, target: EventTarget | null): HTMLImageElement | null => {
    const element = target instanceof Element ? target : target instanceof Node ? target.parentElement : null;
    if (!element) {
        return null;
    }
    const img = element.closest("img") as HTMLImageElement | null;
    if (!img || isPlantumlRenderImage(img)) {
        return null;
    }
    if (vditor.currentMode === "wysiwyg" && img.parentElement?.classList.contains("vditor-wysiwyg__preview")) {
        return null;
    }
    return img;
};

export const bindImageResizeHover = (vditor: IVditor, editorElement: HTMLElement) => {
    const hoverButton = document.createElement("button");
    hoverButton.type = "button";
    hoverButton.className = "vditor-image-resize-hover";
    hoverButton.setAttribute("aria-label", "Adjust image size");
    hoverButton.innerHTML = `<span class="vditor-image-resize-hover__icon">${codicon("screen-full")}</span><span class="vditor-image-resize-hover__text">Size</span>`;

    const panel = document.createElement("div");
    panel.className = "vditor-image-resize-panel";

    const widthControl = document.createElement("label");
    widthControl.className = "vditor-image-resize-panel__field";
    widthControl.innerHTML = `<span class="vditor-image-resize-panel__label">W</span>`;
    const widthInput = document.createElement("input");
    widthInput.type = "number";
    widthInput.min = String(IMAGE_RESIZE_MIN_DIMENSION);
    widthInput.step = "1";
    widthInput.className = "vditor-image-resize-panel__input";
    widthInput.placeholder = "px";
    widthInput.setAttribute("aria-label", "Image width");
    widthControl.appendChild(widthInput);

    const heightControl = document.createElement("label");
    heightControl.className = "vditor-image-resize-panel__field";
    heightControl.innerHTML = `<span class="vditor-image-resize-panel__label">H</span>`;
    const heightInput = document.createElement("input");
    heightInput.type = "number";
    heightInput.min = String(IMAGE_RESIZE_MIN_DIMENSION);
    heightInput.step = "1";
    heightInput.className = "vditor-image-resize-panel__input";
    heightInput.placeholder = "px";
    heightInput.setAttribute("aria-label", "Image height");
    heightControl.appendChild(heightInput);

    panel.append(widthControl, heightControl);
    document.body.append(hoverButton, panel);

    if (!vditor.options.isPro) {
        hoverButton.classList.add("vditor-pro-locked");
        hoverButton.insertAdjacentHTML("beforeend",
            `<span class="vditor-pro-locked__badge" aria-hidden="true">PRO</span>`);
    }

    let activeImage: HTMLImageElement | null = null;
    let panelOpen = false;
    let hideTimer = 0;

    const clearHideTimer = () => {
        if (hideTimer) {
            window.clearTimeout(hideTimer);
            hideTimer = 0;
        }
    };

    const hidePanel = () => {
        panelOpen = false;
        panel.classList.remove("vditor-image-resize-panel--visible");
    };

    const hideHover = () => {
        clearHideTimer();
        hidePanel();
        hoverButton.classList.remove("vditor-image-resize-hover--visible");
        activeImage = null;
    };

    const scheduleHide = () => {
        clearHideTimer();
        hideTimer = window.setTimeout(() => {
            if (!hoverButton.matches(":hover") && !panel.matches(":hover")) {
                hideHover();
            }
        }, 80);
    };

    const getRenderedDimensions = (img: HTMLImageElement) => {
        const rect = img.getBoundingClientRect();
        const width = Math.max(IMAGE_RESIZE_MIN_DIMENSION, Math.round(rect.width || img.width || img.naturalWidth || IMAGE_RESIZE_MIN_DIMENSION));
        const height = Math.max(IMAGE_RESIZE_MIN_DIMENSION, Math.round(rect.height || img.height || img.naturalHeight || IMAGE_RESIZE_MIN_DIMENSION));
        return { width, height };
    };

    const syncInputs = () => {
        if (!activeImage) {
            widthInput.value = "";
            heightInput.value = "";
            return;
        }
        const { width, height } = getRenderedDimensions(activeImage);
        widthInput.value = String(width);
        heightInput.value = String(height);
    };

    const positionElements = () => {
        if (!activeImage || !activeImage.isConnected) {
            hideHover();
            return;
        }
        const rect = activeImage.getBoundingClientRect();
        const buttonTop = Math.max(12, rect.top + 8);
        const buttonLeft = Math.max(12, rect.right - 84);
        hoverButton.style.top = `${buttonTop}px`;
        hoverButton.style.left = `${buttonLeft}px`;

        if (!panelOpen) {
            return;
        }
        const panelTop = Math.min(window.innerHeight - 56, buttonTop + 38);
        const panelLeft = Math.min(window.innerWidth - 156, Math.max(12, rect.right - 156));
        panel.style.top = `${panelTop}px`;
        panel.style.left = `${panelLeft}px`;
    };

    const showForImage = (img: HTMLImageElement) => {
        activeImage = img;
        syncInputs();
        hoverButton.classList.add("vditor-image-resize-hover--visible");
        positionElements();
    };

    const updateDimension = (attribute: "width" | "height", rawValue: string) => {
        if (!activeImage) {
            return;
        }
        const value = rawValue.trim();
        if (value === "") {
            activeImage.removeAttribute(attribute);
        } else {
            const nextValue = Number(value);
            if (!Number.isFinite(nextValue)) {
                return;
            }
            activeImage.setAttribute(attribute, String(Math.max(
                IMAGE_RESIZE_MIN_DIMENSION,
                Math.round(nextValue),
            )));
        }
        afterRenderEvent(vditor);
        syncInputs();
        positionElements();
    };

    widthInput.addEventListener("input", () => updateDimension("width", widthInput.value));
    heightInput.addEventListener("input", () => updateDimension("height", heightInput.value));

    hoverButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!activeImage) {
            return;
        }
        if (!vditor.options.isPro) {
            telemetry(vditor, "markdown.proRequired", { feature: "image-resize" });
            vditor.options.onRequirePro?.("image-resize");
            return;
        }
        panelOpen = !panelOpen;
        panel.classList.toggle("vditor-image-resize-panel--visible", panelOpen);
        if (panelOpen) {
            syncInputs();
            positionElements();
            widthInput.focus();
            widthInput.select();
        }
    });

    editorElement.addEventListener("mouseover", (event) => {
        const img = resolveEditableHoverImage(vditor, event.target);
        if (!img) {
            return;
        }
        clearHideTimer();
        showForImage(img);
    });

    editorElement.addEventListener("mousemove", () => {
        if (activeImage) {
            positionElements();
        }
    });

    editorElement.addEventListener("mouseleave", (event: MouseEvent) => {
        const related = event.relatedTarget as HTMLElement | null;
        if (related?.closest(".vditor-image-resize-hover") || related?.closest(".vditor-image-resize-panel")) {
            return;
        }
        scheduleHide();
    });

    hoverButton.addEventListener("mouseleave", scheduleHide);
    panel.addEventListener("mouseleave", scheduleHide);
    hoverButton.addEventListener("mouseenter", clearHideTimer);
    panel.addEventListener("mouseenter", clearHideTimer);

    document.addEventListener("mousedown", (event) => {
        const target = event.target as HTMLElement | null;
        if (target?.closest(".vditor-image-resize-hover") || target?.closest(".vditor-image-resize-panel")) {
            return;
        }
        if (activeImage && target && (target === activeImage || activeImage.contains(target))) {
            return;
        }
        hideHover();
    });

    window.addEventListener("scroll", () => {
        if (activeImage) {
            positionElements();
        }
    }, true);
    window.addEventListener("resize", () => {
        if (activeImage) {
            positionElements();
        }
    });
};

export const focusEvent = (vditor: IVditor, editorElement: HTMLElement) => {
    editorElement.addEventListener("focus", () => {
        if (vditor.options.focus) {
            vditor.options.focus(getMarkdown(vditor));
        }
        hidePanel(vditor, ["subToolbar", "hint"]);
    });
};

export const dblclickEvent = (vditor: IVditor, editorElement: HTMLElement) => {
    editorElement.addEventListener("dblclick", (event: MouseEvent & { target: HTMLElement }) => {
        if (event.target.tagName === "IMG" && !isPlantumlRenderImage(event.target)) {
            previewImage(event.target as HTMLImageElement, {
                vditor,
                lang: vditor.options.lang,
                theme: vditor.options.theme,
            });
        }
    });
};

export const blurEvent = (vditor: IVditor, editorElement: HTMLElement) => {
    editorElement.addEventListener("blur", (event: FocusEvent) => {
        if (vditor.currentMode === "ir") {
            const expandElement = vditor.ir.element.querySelector(".vditor-ir__node--expand");
            if (expandElement) {
                expandElement.classList.remove("vditor-ir__node--expand");
            }
        }
        if (vditor.currentMode === "wysiwyg" || vditor.currentMode === "ir") {
            clearTimeout(vditor[vditor.currentMode].hlToolbarTimeoutId);
        }
        clearActiveHeadingMarker(vditor);
        const relatedTarget = event.relatedTarget as HTMLElement | null;
        if (relatedTarget?.closest(".vditor-ai-dialog-overlay")) {
            return;
        }
        if (!relatedTarget || (!isInsideCodeMirror(relatedTarget) && !isInsideCodeBlockChrome(relatedTarget))) {
            vditor[vditor.currentMode].range = getEditorRange(vditor);
            saveCacheFocus(vditor);
        }
        if (vditor.options.blur) {
            vditor.options.blur(getMarkdown(vditor));
        }
    });
};

export const dropEvent = (vditor: IVditor, editorElement: HTMLElement) => {
    editorElement.addEventListener("dragstart", (event) => {
        // 选中编辑器中的文字进行拖拽
        event.dataTransfer.setData(Constants.DROP_EDITOR, Constants.DROP_EDITOR);
    });
    editorElement.addEventListener("drop",
        (event: ClipboardEvent & { dataTransfer?: DataTransfer, target: HTMLElement }) => {
            if (event.dataTransfer.getData(Constants.DROP_EDITOR)) {
                // 编辑器内选中文字拖拽
                execAfterRender(vditor);
            } else if (event.dataTransfer.types.includes("Files") || event.dataTransfer.types.includes("text/html")) {
                // 外部文件拖入编辑器中或者编辑器内选中文字拖拽
                paste(vditor, event, {
                    pasteCode: (code: string) => {
                        insertPastedCode(vditor, code);
                    },
                });
            }
        });
};

export const copyEvent =
    (vditor: IVditor, editorElement: HTMLElement, copy: (event: ClipboardEvent, vditor: IVditor) => void) => {
        editorElement.addEventListener("copy", (event: ClipboardEvent) => copy(event, vditor));
    };

export const cutEvent =
    (vditor: IVditor, editorElement: HTMLElement, copy: (event: ClipboardEvent, vditor: IVditor) => void) => {
        editorElement.addEventListener("cut", (event: ClipboardEvent) => {
            const cutBlock = resolveTextCutBlock(event);
            if (cutBlock && copyTextCutBlock(event, vditor, cutBlock)) {
                removeTextCutBlock(vditor, cutBlock);
                return;
            }
            copy(event, vditor);
            document.execCommand("delete");
        });
    };

export const macOptionSymbolEvent = (vditor: IVditor) => {
    vditor.element.addEventListener("keydown", (event: KeyboardEvent) => {
        if (!shouldBlockMacOptionSymbol(event)) {
            return;
        }
        event.preventDefault();
    }, true);
};

export const hotkeyEvent = (vditor: IVditor, editorElement: HTMLElement) => {
    editorElement.addEventListener("keydown", (event: KeyboardEvent & { target: HTMLElement }) => {
        if (isInsideCodeBlockChrome(event.target)) {
            return;
        }
        if (vditor.currentMode === "wysiwyg" || vditor.currentMode === "ir") {
            handleAutoSymbolPair(event);
        }
        // hint: 上下选择
        if (vditor.options.hint.extend.length > 0 &&
            vditor.hint.select(event, vditor)) {
            return;
        }

        if (handleVscodeShortcut(vditor, event)) {
            return;
        }

        if (vditor.currentMode === "wysiwyg") {
            if (processKeydown(vditor, event)) {
                event.stopPropagation()
                return;
            }
        } else if (vditor.currentMode === "ir") {
            if (irProcessKeydown(vditor, event)) {
                return;
            }
        }

        if (handlerHistoryEvent(event, vditor))
            return;

        if (vditor.options.ctrlEnter && matchHotKey("⌘Enter", event)) {
            vditor.options.ctrlEnter(getMarkdown(vditor));
            event.preventDefault();
            return;
        }

        // undo
        if (matchHotKey("⌘Z", event) && !vditor.toolbar.elements.undo) {
            vditor.undo.undo(vditor);
            event.preventDefault();
            return;
        }

        // redo
        if (matchHotKey("⌘Y", event) && !vditor.toolbar.elements.redo) {
            vditor.undo.redo(vditor);
            event.preventDefault();
            return;
        }

        // esc
        if (event.key === "Escape") {
            if (vditor.hint.element.style.display === "block") {
                vditor.hint.element.style.display = "none";
            } else if (vditor.currentMode === "wysiwyg"
                && vditor.wysiwyg.popover.style.display === "block"
                && (vditor.wysiwyg.popover.classList.contains("vditor-panel--link")
                    || vditor.wysiwyg.popover.classList.contains("vditor-panel--link-ref")
                    || vditor.wysiwyg.popover.classList.contains("vditor-panel--image"))) {
                const sourceElement = (vditor.wysiwyg.popover as { _sourceElement?: HTMLElement })._sourceElement;
                if (sourceElement) {
                    exitLinkPopoverToElement(vditor, sourceElement);
                } else {
                    hideLinkPopover(vditor);
                }
            } else if (vditor.options.esc && !event.isComposing) {
                vditor.options.esc(getMarkdown(vditor));
            }
            event.preventDefault();
            return;
        }

        // h1 - h6 hotkey
        if (isCtrl(event) && event.altKey && !event.shiftKey && /^Digit[1-6]$/.test(event.code)) {
            if (vditor.currentMode === "wysiwyg") {
                const tagName = event.code.replace("Digit", "H");
                if (hasClosestByMatchTag(getSelection().getRangeAt(0).startContainer, tagName)) {
                    removeHeading(vditor);
                } else {
                    setHeading(vditor, tagName);
                }
                afterRenderEvent(vditor);
            } else if (vditor.currentMode === "ir") {
                processHeading(vditor, "#".repeat(parseInt(event.code.replace("Digit", ""), 10)) + " ");
            }
            event.preventDefault();
            return true;
        }

        // toggle edit mode
        if (isCtrl(event) && event.altKey && !event.shiftKey && /^Digit[7-8]$/.test(event.code)) {
            if (event.code === "Digit7") {
                setEditMode(vditor, "wysiwyg", event);
            } else if (event.code === "Digit8") {
                setEditMode(vditor, "ir", event);
            }
            return true;
        }

        // toolbar action
        vditor.options.toolbar.find((menuItem: IMenuItem) => {
            if (!menuItem.hotkey || menuItem.toolbar) {
                if (menuItem.toolbar) {
                    const sub = menuItem.toolbar.find((subMenuItem: IMenuItem) => {
                        if (!subMenuItem.hotkey) {
                            return false;
                        }
                        if (matchHotKey(subMenuItem.hotkey, event)) {
                            vditor.toolbar.elements[subMenuItem.name].children[0]
                                .dispatchEvent(new CustomEvent(getEventName()));
                            event.preventDefault();
                            return true;
                        }
                    });
                    return sub ? true : false;
                }
                return false;
            }
            if (matchHotKey(menuItem.hotkey, event)) {
                vditor.toolbar.elements[menuItem.name].children[0].dispatchEvent(new CustomEvent(getEventName()));
                event.preventDefault();
                event.stopPropagation();
                return true;
            }
        });
    });
};

export const selectEvent = (vditor: IVditor, editorElement: HTMLElement) => {
    editorElement.addEventListener("selectstart", (event: Event & { target: HTMLElement }) => {
        if (isInsideCodeMirror(event.target) || isInsideCodeBlockChrome(event.target)) {
            return;
        }
        editorElement.onmouseup = () => {
            setTimeout(() => { // 鼠标放开后 range 没有即时更新
                const selectText = getSelectText(vditor[vditor.currentMode].element);
                if (selectText.trim()) {
                    if (vditor.options.select) {
                        vditor.options.select(selectText);
                    }
                }
            });
        };
    });
};
