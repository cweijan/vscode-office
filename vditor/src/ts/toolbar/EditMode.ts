import {Constants} from "../constants";
import {processAfterRender} from "../ir/process";
import {getMarkdown} from "../markdown/getMarkdown";
import {mathRender} from "../markdown/mathRender";
import {
    buildEditModePickerPanelHTML,
    queryEditModePickerPanel,
    refreshEditModePickerPanel,
} from "../ui/editModePickerPanel";
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

const refreshEditModePanel = (vditor: IVditor) => {
    const editModeItem = vditor.toolbar.elements["edit-mode"];
    if (!editModeItem) {
        return;
    }
    const panelRoot = queryEditModePickerPanel(editModeItem);
    if (panelRoot) {
        refreshEditModePickerPanel(panelRoot, vditor.currentMode);
    }
};

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

    if (typeof event !== "string" && vditor.options.changeEditMode) {
        vditor.options.changeEditMode(vditor.currentMode);
    }

    refreshEditModePanel(vditor);
};

export class EditMode extends MenuItem {
    public element: HTMLElement;

    constructor(vditor: IVditor, menuItem: IMenuItem) {
        super(vditor, menuItem);

        const panelElement = document.createElement("div");
        panelElement.className = `vditor-hint${menuItem.level === 2 ? "" : " vditor-panel--arrow"}`;
        panelElement.innerHTML = buildEditModePickerPanelHTML(vditor.currentMode);

        this.element.appendChild(panelElement);

        this._bindEvent(vditor, panelElement, menuItem);
    }

    public _bindEvent(vditor: IVditor, panelElement: HTMLElement, menuItem: IMenuItem) {
        const actionBtn = this.element.children[0] as HTMLElement;
        toggleSubMenu(vditor, panelElement, actionBtn, menuItem.level);

        actionBtn.addEventListener(getEventName(), () => {
            const panelRoot = queryEditModePickerPanel(panelElement);
            if (panelRoot) {
                refreshEditModePickerPanel(panelRoot, vditor.currentMode);
            }
        }, true);

        panelElement.addEventListener(getEventName(), (event: MouseEvent & { target: HTMLElement }) => {
            const button = event.target.closest("button[data-mode]") as HTMLElement | null;
            if (!button) {
                return;
            }
            const mode = button.getAttribute("data-mode") || "";
            setEditMode(vditor, mode, event);
            event.preventDefault();
            event.stopPropagation();
        });
    }
}
