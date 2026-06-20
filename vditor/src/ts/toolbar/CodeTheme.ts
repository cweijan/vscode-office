import {CM_THEME_GROUPS} from "../ui/codeMirrorColorThemes";
import {setCodeTheme} from "../ui/setCodeTheme";
import {getEventName} from "../util/compatibility";
import {MenuItem} from "./MenuItem";
import {hidePanel, toggleSubMenu} from "./setToolbar";

const formatThemeLabel = (themeId: string) => themeId.replace(/-/g, " ");

const buildCodeThemePanelHTML = () => {
    let innerHTML = `<div class="vditor-cm-theme-panel" style="overflow: auto;max-height:${window.innerHeight / 2}px">`;
    for (const group of CM_THEME_GROUPS) {
        const title = window.VditorI18n[group.titleKey] || group.titleKey;
        innerHTML += `<div class="vditor-cm-theme-panel__section">`;
        innerHTML += `<div class="vditor-cm-theme-panel__title">${title}</div>`;
        for (const theme of group.themes) {
            innerHTML += `<button type="button" data-theme="${theme}">${formatThemeLabel(theme)}</button>`;
        }
        innerHTML += `</div>`;
    }
    innerHTML += `</div>`;
    return innerHTML;
};

export class CodeTheme extends MenuItem {
    public element: HTMLElement;

    constructor(vditor: IVditor, menuItem: IMenuItem) {
        super(vditor, menuItem);

        const actionBtn = this.element.children[0] as HTMLElement;

        const panelElement = document.createElement("div");
        panelElement.className = `vditor-hint${menuItem.level === 2 ? "" : " vditor-panel--arrow"}`;
        panelElement.innerHTML = buildCodeThemePanelHTML();
        panelElement.addEventListener(getEventName(), (event: MouseEvent & { target: HTMLElement }) => {
            const button = event.target.closest("button[data-theme]") as HTMLElement | null;
            if (!button) {
                return;
            }
            hidePanel(vditor, ["subToolbar"]);
            const theme = button.getAttribute("data-theme") || "";
            vditor.options.codeMirrorTheme = theme;
            vditor.options.preview.hljs.style = theme;
            setCodeTheme(theme, vditor.element);
            if (vditor.options.changeCodeTheme) {
                vditor.options.changeCodeTheme(theme);
            }
            event.preventDefault();
            event.stopPropagation();
        });
        this.element.appendChild(panelElement);

        toggleSubMenu(vditor, panelElement, actionBtn, menuItem.level);
    }
}
