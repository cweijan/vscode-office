import { Constants } from "../constants";
import { isInsideCodeBlockChrome, isInsideCodeMirror } from "../codeBlock/codeMirrorManager";
import { processHeading } from "../ir/process";
import { processKeydown as irProcessKeydown } from "../ir/processKeydown";
import { getMarkdown } from "../markdown/getMarkdown";
import { previewImage } from "../preview/image";
import { setEditMode } from "../toolbar/EditMode";
import { hidePanel } from "../toolbar/setToolbar";
import { afterRenderEvent, handlerHistoryEvent } from "../wysiwyg/afterRenderEvent";
import { hideLinkPopover } from "../wysiwyg/highlightToolbarWYSIWYG";
import { processKeydown } from "../wysiwyg/processKeydown";
import { removeHeading, setHeading } from "../wysiwyg/setHeading";
import { getEventName, isCtrl } from "./compatibility";
import { shouldBlockMacOptionSymbol } from "./macOptionSymbol";
import { copyTextCutBlock, removeTextCutBlock, resolveTextCutBlock } from "./cutEmptySelection";
import { execAfterRender, paste } from "./fixBrowserBehavior";
import { getSelectText } from "./getSelectText";
import { hasClosestByAttribute, hasClosestByMatchTag } from "./hasClosest";
import { matchHotKey } from "./hotKey";
import { getEditorRange } from "./selection";
import { saveCacheFocus } from "./cacheFocus";
import { clearActiveHeadingMarker } from "./updateActiveHeadingMarker";
import { handleVscodeShortcut } from "./vscodeShortcut";

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
        if (event.target.tagName === "IMG") {
            previewImage(event.target as HTMLImageElement, vditor.options.lang, vditor.options.theme);
            return;
        }

        if (vditor.currentMode === "wysiwyg") {
            const aElement = event.target.closest("A") as HTMLAnchorElement;
            const href = aElement?.getAttribute("href");
            if (href) {
                window.open(href);
                event.preventDefault();
            }
            return;
        }

        if (vditor.currentMode === "ir") {
            const aElement = hasClosestByAttribute(event.target, "data-type", "a");
            if (aElement && !aElement.classList.contains("vditor-ir__node--expand")) {
                const link = aElement.querySelector(":scope > .vditor-ir__marker--link")?.textContent;
                if (link) {
                    window.open(link);
                    event.preventDefault();
                }
            }
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
        const relatedTarget = event.relatedTarget as Node | null;
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
                        document.execCommand("insertHTML", false, code);
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
                hideLinkPopover(vditor);
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
