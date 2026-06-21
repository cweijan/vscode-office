import {CM_THEME_GROUPS} from "../ui/codeMirrorColorThemes";
import {applyCodeMirrorTheme, resolveCodeMirrorTheme} from "../ui/setCodeTheme";
import {buildThemePickerPanelHTML, refreshThemePickerPanel} from "../ui/themePickerPanel";
import {getEventName} from "../util/compatibility";
import {MenuItem} from "./MenuItem";
import {toggleSubMenu} from "./setToolbar";

const formatThemeLabel = (themeId: string) => themeId;

const buildCodeThemePanelHTML = (currentTheme: string) => {
    return buildThemePickerPanelHTML(CM_THEME_GROUPS, currentTheme, formatThemeLabel);
};

const refreshCodeThemePanel = (panelElement: HTMLElement, currentTheme: string) => {
    const panelRoot = panelElement.querySelector(".vditor-cm-theme-panel") as HTMLElement | null;
    if (panelRoot) {
        refreshThemePickerPanel(panelRoot, currentTheme);
    }
};

export class CodeTheme extends MenuItem {
    public element: HTMLElement;

    constructor(vditor: IVditor, menuItem: IMenuItem) {
        super(vditor, menuItem);

        const actionBtn = this.element.children[0] as HTMLElement;
        const currentTheme = resolveCodeMirrorTheme(vditor.options);

        const panelElement = document.createElement("div");
        panelElement.className = `vditor-hint${menuItem.level === 2 ? "" : " vditor-panel--arrow"}`;
        panelElement.innerHTML = buildCodeThemePanelHTML(currentTheme);
        panelElement.addEventListener(getEventName(), (event: MouseEvent & { target: HTMLElement }) => {
            const button = event.target.closest("button[data-theme]") as HTMLElement | null;
            if (!button) {
                return;
            }
            const theme = button.getAttribute("data-theme") || "";
            applyCodeMirrorTheme(vditor, theme);
            refreshCodeThemePanel(panelElement, theme);
            event.preventDefault();
            event.stopPropagation();
        });
        this.element.appendChild(panelElement);

        actionBtn.addEventListener(getEventName(), () => {
            refreshCodeThemePanel(panelElement, resolveCodeMirrorTheme(vditor.options));
        }, true);

        toggleSubMenu(vditor, panelElement, actionBtn, menuItem.level);
    }
}
