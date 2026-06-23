import { CM_THEME_GROUPS } from "./codeMirrorColorThemes";
import {
    buildEditorThemePickerPanelHTML,
    queryEditorThemePickerPanel,
    refreshEditorThemePickerPanel,
} from "./editorThemePickerPanel";
import { resolveCodeMirrorTheme } from "./setCodeTheme";

export const SETTINGS_PANEL_CLASS = "vditor-settings-panel";

const EDIT_MODES = [
    { id: "wysiwyg", label: "Visual" },
    { id: "ir", label: "Markdown" },
] as const;

const formatThemeLabel = (themeId: string) => themeId;

const buildEditModeSegmentedHTML = (currentMode: string) => {
    let html = `<div class="${SETTINGS_PANEL_CLASS}__segmented" role="group">`;
    for (const mode of EDIT_MODES) {
        const label = mode.label;
        const isCurrent = mode.id === currentMode;
        const currentClass = isCurrent ? ` ${SETTINGS_PANEL_CLASS}__segment--current` : "";
        html += `<button type="button" class="${SETTINGS_PANEL_CLASS}__segment${currentClass}" data-mode="${mode.id}" aria-pressed="${isCurrent ? "true" : "false"}" data-current="${isCurrent ? "true" : "false"}">${label}</button>`;
    }
    html += "</div>";
    return html;
};

export const buildSettingsPanelHTML = (vditor: IVditor) => {
    const editModeLabel = window.VditorI18n["edit-mode-label"] || "Edit Mode";
    const codeThemeLabel = window.VditorI18n["code-theme"] || window.VditorI18n["codeTheme"] || "Code Theme";
    const codeTheme = resolveCodeMirrorTheme(vditor.options);
    return `<div class="${SETTINGS_PANEL_CLASS}">
        <div class="${SETTINGS_PANEL_CLASS}__section">
            <div class="${SETTINGS_PANEL_CLASS}__title">${editModeLabel}</div>
            ${buildEditModeSegmentedHTML(vditor.currentMode)}
        </div>
        <div class="${SETTINGS_PANEL_CLASS}__section">
            <div class="${SETTINGS_PANEL_CLASS}__group">
                <button type="button" class="${SETTINGS_PANEL_CLASS}__row" data-settings-code-theme>
                    <span class="${SETTINGS_PANEL_CLASS}__row-label">${codeThemeLabel}</span>
                    <span class="${SETTINGS_PANEL_CLASS}__row-value" data-settings-code-theme-value>${codeTheme}</span>
                    <span class="codicon codicon-chevron-right ${SETTINGS_PANEL_CLASS}__row-chevron" aria-hidden="true"></span>
                </button>
            </div>
        </div>
    </div>`;
};

export const buildSettingsCodeThemePanelHTML = (currentTheme: string) => {
    return buildEditorThemePickerPanelHTML(CM_THEME_GROUPS, currentTheme, formatThemeLabel);
};

export const refreshSettingsPanel = (panelElement: HTMLElement, vditor: IVditor) => {
    for (const button of panelElement.querySelectorAll(`.${SETTINGS_PANEL_CLASS}__segment[data-mode]`)) {
        const mode = button.getAttribute("data-mode") || "";
        const isCurrent = mode === vditor.currentMode;
        button.classList.toggle(`${SETTINGS_PANEL_CLASS}__segment--current`, isCurrent);
        button.setAttribute("aria-pressed", isCurrent ? "true" : "false");
        button.setAttribute("data-current", isCurrent ? "true" : "false");
    }

    const codeTheme = resolveCodeMirrorTheme(vditor.options);
    const codeThemeValue = panelElement.querySelector("[data-settings-code-theme-value]");
    if (codeThemeValue) {
        codeThemeValue.textContent = codeTheme;
    }

    const codeThemePanel = queryEditorThemePickerPanel(panelElement);
    if (codeThemePanel) {
        refreshEditorThemePickerPanel(codeThemePanel, codeTheme);
    }
};

export const refreshSettingsToolbarPanel = (vditor: IVditor) => {
    const settingsItem = vditor.toolbar.elements.settings;
    if (!settingsItem) {
        return;
    }
    const panelElement = settingsItem.querySelector(".vditor-hint") as HTMLElement | null;
    if (!panelElement || panelElement.style.display !== "block") {
        return;
    }
    refreshSettingsPanel(panelElement, vditor);
};
