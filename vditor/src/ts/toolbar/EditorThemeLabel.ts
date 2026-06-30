import {openEditorThemePanel} from "../ui/editorThemeToolbar";
import {getEventName} from "../util/compatibility";
import {telemetryToolbarClickOnly} from "../util/telemetry";
import {MenuItem} from "./MenuItem";

export class EditorThemeLabel extends MenuItem {
    public element: HTMLElement;

    constructor(vditor: IVditor, menuItem: IMenuItem) {
        super(vditor, menuItem);

        const actionBtn = this.element.children[0] as HTMLElement;
        const label = window.VditorI18n["editor-theme-label"] || "Theme:";
        actionBtn.innerHTML = `<span class="vditor-editor-theme-label">${label}</span>`;

        const tip = window.VditorI18n["editor-theme-tip"] || menuItem.tip || "Select Theme";
        actionBtn.setAttribute("aria-label", tip);

        actionBtn.addEventListener(getEventName(), (event) => {
            event.preventDefault();
            event.stopPropagation();
            const panelHost = vditor.toolbar.elements["editor-theme"]?.querySelector(".vditor-hint") as HTMLElement | null;
            const willOpen = panelHost?.style.display !== "block";
            openEditorThemePanel(vditor, actionBtn);
            if (willOpen) {
                telemetryToolbarClickOnly(vditor, event, "editor-theme-label");
            }
        });
    }
}
