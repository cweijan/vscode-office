import {
    buildSettingsCodeThemePanelHTML,
    buildSettingsPanelHTML,
    refreshSettingsPanel,
    SETTINGS_PANEL_CLASS,
} from "../ui/settingsPanel";
import { applyCodeMirrorTheme, resolveCodeMirrorTheme } from "../ui/setCodeTheme";
import {
    IFloatingThemePanelHandle,
    openFloatingThemePanel,
} from "../ui/themePickerFloatingPanel";
import {
    queryEditorThemePickerPanel,
    refreshEditorThemePickerPanel,
} from "../ui/editorThemePickerPanel";
import { getEventName } from "../util/compatibility";
import { setEditMode } from "./EditMode";
import { MenuItem } from "./MenuItem";
import { hidePanel, toggleSubMenu } from "./setToolbar";

export class Settings extends MenuItem {
    public element: HTMLElement;

    constructor(vditor: IVditor, menuItem: IMenuItem) {
        super(vditor, menuItem);

        const actionBtn = this.element.children[0] as HTMLElement;
        const panelElement = document.createElement("div");
        panelElement.className = `vditor-hint${menuItem.level === 2 ? "" : " vditor-panel--arrow"}`;
        panelElement.innerHTML = buildSettingsPanelHTML(vditor);
        this.element.appendChild(panelElement);

        const themePanelElement = document.createElement("div");
        themePanelElement.className = "vditor-hint vditor-panel--arrow";
        themePanelElement.innerHTML = buildSettingsCodeThemePanelHTML(resolveCodeMirrorTheme(vditor.options));
        let themePanelHandle: IFloatingThemePanelHandle | null = null;

        const closeThemePanel = () => {
            themePanelHandle?.close();
            themePanelHandle = null;
            themePanelElement.style.display = "none";
            panelElement.querySelector("[data-settings-code-theme]")
                ?.classList.remove(`${SETTINGS_PANEL_CLASS}__row--open`);
        };

        const openThemePanel = (anchor: HTMLElement) => {
            if (themePanelHandle) {
                closeThemePanel();
                return;
            }
            hidePanel(vditor, ["hint", "popover"]);
            const themePanelRoot = queryEditorThemePickerPanel(themePanelElement);
            if (themePanelRoot) {
                refreshEditorThemePickerPanel(themePanelRoot, resolveCodeMirrorTheme(vditor.options));
            }
            themePanelHandle = openFloatingThemePanel(themePanelElement, anchor);
            anchor.classList.add(`${SETTINGS_PANEL_CLASS}__row--open`);
        };

        actionBtn.addEventListener(getEventName(), () => {
            closeThemePanel();
            refreshSettingsPanel(panelElement, vditor);
        }, true);

        panelElement.addEventListener(getEventName(), (event: MouseEvent & { target: HTMLElement }) => {
            const codeThemeTrigger = event.target.closest("[data-settings-code-theme]") as HTMLElement | null;
            if (codeThemeTrigger) {
                openThemePanel(codeThemeTrigger);
                refreshSettingsPanel(panelElement, vditor);
                event.preventDefault();
                event.stopPropagation();
                return;
            }

            const modeButton = event.target.closest("button[data-mode]") as HTMLElement | null;
            if (modeButton) {
                setEditMode(vditor, modeButton.getAttribute("data-mode") || "", event, { keepToolbarPanel: true });
                refreshSettingsPanel(panelElement, vditor);
                event.preventDefault();
                event.stopPropagation();
            }
        });

        themePanelElement.addEventListener(getEventName(), (event: MouseEvent & { target: HTMLElement }) => {
            const themeButton = event.target.closest("button[data-theme]") as HTMLElement | null;
            if (!themeButton) {
                return;
            }
            const theme = themeButton.getAttribute("data-theme") || "";
            applyCodeMirrorTheme(vditor, theme);
            refreshSettingsPanel(panelElement, vditor);
            const themePanelRoot = queryEditorThemePickerPanel(themePanelElement);
            if (themePanelRoot) {
                refreshEditorThemePickerPanel(themePanelRoot, theme);
            }
            event.preventDefault();
            event.stopPropagation();
        });

        document.addEventListener("pointerdown", (event) => {
            if (!themePanelHandle) {
                return;
            }
            const target = event.target as Node | null;
            if (
                target &&
                (themePanelElement.contains(target) || panelElement.contains(target))
            ) {
                return;
            }
            closeThemePanel();
        }, true);

        toggleSubMenu(vditor, panelElement, actionBtn, menuItem.level);
    }
}
