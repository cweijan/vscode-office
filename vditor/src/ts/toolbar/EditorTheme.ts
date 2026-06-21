import {
    bindEditorThemePanelHost,
    buildEditorThemePanelHTML,
    refreshEditorThemePanel,
} from "../ui/editorThemeToolbar";
import {setEditorTheme} from "../ui/setEditorTheme";
import {getEventName} from "../util/compatibility";
import {MenuItem} from "./MenuItem";
import {toggleSubMenu} from "./setToolbar";

export class EditorTheme extends MenuItem {
    public element: HTMLElement;

    constructor(vditor: IVditor, menuItem: IMenuItem) {
        super(vditor, menuItem);

        const actionBtn = this.element.children[0] as HTMLElement;
        const currentTheme = vditor.options.editorTheme || "Auto";

        const panelElement = document.createElement("div");
        panelElement.className = `vditor-hint${menuItem.level === 2 ? "" : " vditor-panel--arrow"}`;
        panelElement.innerHTML = buildEditorThemePanelHTML(currentTheme);
        bindEditorThemePanelHost(vditor, panelElement);
        panelElement.addEventListener(getEventName(), (event: MouseEvent & { target: HTMLElement }) => {
            const button = event.target.closest("button[data-theme]") as HTMLElement | null;
            if (!button) {
                return;
            }
            const theme = button.getAttribute("data-theme") || "";
            setEditorTheme(vditor, theme);
            refreshEditorThemePanel(panelElement, theme);
            event.preventDefault();
            event.stopPropagation();
        });
        this.element.appendChild(panelElement);

        const tip = window.VditorI18n["editor-theme-tip"] || menuItem.tip || "Select Theme";
        actionBtn.setAttribute("aria-label", tip);

        actionBtn.addEventListener(getEventName(), () => {
            refreshEditorThemePanel(panelElement, vditor.options.editorTheme || "Auto");
        }, true);

        toggleSubMenu(vditor, panelElement, actionBtn, menuItem.level);
    }
}
