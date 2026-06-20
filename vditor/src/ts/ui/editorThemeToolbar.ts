import {hidePanel} from "../toolbar/setToolbar";
import {EDITOR_THEME_GROUPS} from "./editorThemeCatalog";
import {buildThemePickerPanelHTML, refreshThemePickerPanel} from "./themePickerPanel";

const PANEL_HOST_KEY = "__editorThemePanelHost";

const getPanelHost = (vditor: IVditor): HTMLElement | undefined => {
    return (vditor as IVditor & Record<string, HTMLElement | undefined>)[PANEL_HOST_KEY];
};

export const bindEditorThemePanelHost = (vditor: IVditor, panelElement: HTMLElement) => {
    (vditor as IVditor & Record<string, HTMLElement>)[PANEL_HOST_KEY] = panelElement;
};

export const buildEditorThemePanelHTML = (currentTheme: string) => {
    return buildThemePickerPanelHTML(EDITOR_THEME_GROUPS, currentTheme);
};

export const refreshEditorThemePanel = (panelElement: HTMLElement, currentTheme: string) => {
    const panelRoot = panelElement.querySelector(".vditor-cm-theme-panel") as HTMLElement | null;
    if (panelRoot) {
        refreshThemePickerPanel(panelRoot, currentTheme);
    }
};

export const openEditorThemePanel = (vditor: IVditor, anchorBtn: HTMLElement) => {
    const panelElement = getPanelHost(vditor);
    if (!panelElement) {
        return;
    }

    refreshEditorThemePanel(panelElement, vditor.options.editorTheme || "Auto");

    const toolbarItem = anchorBtn.closest(".vditor-toolbar__item") as HTMLElement | null;
    if (toolbarItem && panelElement.parentElement !== toolbarItem) {
        toolbarItem.appendChild(panelElement);
    }

    vditor.toolbar.element.querySelectorAll(".vditor-hint--current").forEach((item) => {
        item.classList.remove("vditor-hint--current");
    });

    if (panelElement.style.display === "block") {
        panelElement.style.display = "none";
        return;
    }

    hidePanel(vditor, ["subToolbar", "hint", "popover"], panelElement);
    panelElement.style.display = "block";

    if (vditor.toolbar.element.getBoundingClientRect().right - anchorBtn.getBoundingClientRect().right < 250) {
        panelElement.classList.add("vditor-panel--left");
    } else {
        panelElement.classList.remove("vditor-panel--left");
    }
};
