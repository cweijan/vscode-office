import {Constants} from "../constants";
import {processAfterRender} from "../ir/process";
import {getMarkdown} from "../markdown/getMarkdown";
import {mathRender} from "../markdown/mathRender";
import {restoreCacheFocus, wasCacheContentRestored} from "../util/cacheFocus";
import {getEventName} from "../util/compatibility";
import {highlightToolbar} from "../util/highlightToolbar";
import {processCodeRender} from "../util/processCode";
import {renderToc} from "../util/toc";
import {renderDomByMd} from "../wysiwyg/renderDomByMd";
import {renderCodeBlocks} from "../codeBlock/codeMirrorManager";
import {MenuItem} from "./MenuItem";
import {
    disableToolbar,
    enableToolbar,
    hidePanel,
    removeCurrentToolbar,
    showToolbar, toggleSubMenu,
} from "./setToolbar";

export const setEditMode = (vditor: IVditor, type: string, event: Event | string) => {
    if (type === "sv") {
        type = "ir";
    }
    let markdownText;
    if (typeof event !== "string") {
        hidePanel(vditor, ["subToolbar", "hint"]);
        event.preventDefault();
        markdownText = getMarkdown(vditor);
    } else {
        markdownText = event;
    }
    if (vditor.currentMode === type && typeof event !== "string") {
        return;
    }

    enableToolbar(vditor.toolbar.elements, Constants.EDIT_TOOLBARS);
    removeCurrentToolbar(vditor.toolbar.elements, Constants.EDIT_TOOLBARS);
    disableToolbar(vditor.toolbar.elements, ["outdent", "indent"]);

    if (type === "ir") {
        showToolbar(vditor.toolbar.elements, ["outdent", "indent", "outline", "insert-before", "insert-after"]);
        vditor.wysiwyg.element.parentElement.style.display = "none";
        vditor.ir.element.parentElement.style.display = "block";

        vditor.lute.SetVditorIR(true);
        vditor.lute.SetVditorWYSIWYG(false);

        vditor.currentMode = "ir";
        vditor.ir.element.innerHTML = vditor.lute.Md2VditorIRDOM(markdownText);
        processAfterRender(vditor, {
            enableAddUndoStack: true,
            enableHint: false,
            enableInput: false,
        });

        vditor.ir.element.querySelectorAll(".vditor-ir__preview[data-render='2']").forEach((item: HTMLElement) => {
            processCodeRender(item, vditor);
        });
        renderCodeBlocks(vditor);
        vditor.ir.element.querySelectorAll(".vditor-toc").forEach((item: HTMLElement) => {
            mathRender(item, {
                cdn: vditor.options.cdn,
                extPath: vditor.options.extPath,
                math: vditor.options.preview.math,
            });
        });
    } else if (type === "wysiwyg") {
        showToolbar(vditor.toolbar.elements, ["outdent", "indent", "outline", "insert-before", "insert-after"]);
        vditor.wysiwyg.element.parentElement.style.display = "block";
        vditor.ir.element.parentElement.style.display = "none";

        vditor.lute.SetVditorIR(false);
        vditor.lute.SetVditorWYSIWYG(true);

        vditor.currentMode = "wysiwyg";

        renderDomByMd(vditor, markdownText, {
            enableAddUndoStack: true,
            enableHint: false,
            enableInput: false,
        });
        vditor.wysiwyg.element.querySelectorAll(".vditor-toc").forEach((item: HTMLElement) => {
            mathRender(item, {
                cdn: vditor.options.cdn,
                extPath: vditor.options.extPath,
                math: vditor.options.preview.math,
            });
        });
        vditor.wysiwyg.popover.style.display = "none";
    }
    vditor.undo.resetIcon(vditor);
    if (typeof event !== "string") {
        // 初始化不 focus
        vditor[vditor.currentMode].element.focus();
        highlightToolbar(vditor);
    } else if (wasCacheContentRestored(vditor)) {
        restoreCacheFocus(vditor, { onLoad: true });
    }
    renderToc(vditor);

    if (vditor.toolbar.elements["edit-mode"]) {
        vditor.toolbar.elements["edit-mode"].querySelectorAll("button").forEach((item) => {
            item.classList.remove("vditor-menu--current");
        });
        const currentModeBtn = vditor.toolbar.elements["edit-mode"]
            .querySelector(`button[data-mode="${vditor.currentMode}"]`);
        currentModeBtn?.classList.add("vditor-menu--current");
    }

    vditor.outline.toggle(vditor, vditor.options.outline.enable);
};

export class EditMode extends MenuItem {
    public element: HTMLElement;

    constructor(vditor: IVditor, menuItem: IMenuItem) {
        super(vditor, menuItem);

        const panelElement = document.createElement("div");
        panelElement.className = `vditor-hint${menuItem.level === 2 ? "" : " vditor-panel--arrow"}`;
        panelElement.innerHTML = `<button data-mode="wysiwyg">${window.VditorI18n.wysiwyg}</button>
<button data-mode="ir">${window.VditorI18n.instantRendering}</button>`;

        this.element.appendChild(panelElement);

        this._bindEvent(vditor, panelElement, menuItem);
    }

    public _bindEvent(vditor: IVditor, panelElement: HTMLElement, menuItem: IMenuItem) {
        const actionBtn = this.element.children[0] as HTMLElement;
        toggleSubMenu(vditor, panelElement, actionBtn, menuItem.level);

        panelElement.children.item(0).addEventListener(getEventName(), (event: Event) => {
            // wysiwyg
            setEditMode(vditor, "wysiwyg", event);
            event.preventDefault();
            event.stopPropagation();
        });

        panelElement.children.item(1).addEventListener(getEventName(), (event: Event) => {
            // ir
            setEditMode(vditor, "ir", event);
            event.preventDefault();
            event.stopPropagation();
        });
    }
}
