import {
    getGlobalLocalStorageSetting,
    UI_FONT_SIZE_KEY,
    EDITOR_FONT_SIZE_KEY,
    UI_FONT_SIZE_DEFAULT,
    EDITOR_FONT_SIZE_DEFAULT,
    LINE_HEIGHT_KEY,
    LINE_HEIGHT_DEFAULT,
    FONT_FAMILY_KEY,
    FONT_FAMILY_OPTIONS,
    BOLD_COLOR_KEY,
    BOLD_COLOR_OPTIONS,
} from "../util/globalLocalStorageSettings";

export const SETTINGS_PANEL_CLASS = "vditor-settings-panel";

const EDIT_MODES = [
    { id: "wysiwyg", label: "Visual" },
    { id: "ir", label: "Markdown" },
] as const;

const buildEditModeSegmentedHTML = (currentMode: string) => {
    let html = `<div class="${SETTINGS_PANEL_CLASS}__segmented" role="group">`;
    for (const mode of EDIT_MODES) {
        const isCurrent = mode.id === currentMode;
        html += `<button type="button" class="${SETTINGS_PANEL_CLASS}__segment${isCurrent ? ` ${SETTINGS_PANEL_CLASS}__segment--current` : ""}" data-mode="${mode.id}" aria-pressed="${isCurrent}">${mode.label}</button>`;
    }
    html += "</div>";
    return html;
};

const buildFontSizeStepperHTML = (key: string, label: string, value: number) =>
    `<div class="${SETTINGS_PANEL_CLASS}__stepper-row" data-font-key="${key}">
        <span class="${SETTINGS_PANEL_CLASS}__stepper-label">${label}</span>
        <div class="${SETTINGS_PANEL_CLASS}__stepper">
            <button type="button" class="${SETTINGS_PANEL_CLASS}__stepper-btn" data-step="-1">−</button>
            <span class="${SETTINGS_PANEL_CLASS}__stepper-value" data-font-value>${value}px</span>
            <button type="button" class="${SETTINGS_PANEL_CLASS}__stepper-btn" data-step="1">+</button>
        </div>
    </div>`;

const buildLineHeightStepperHTML = (value: number) =>
    `<div class="${SETTINGS_PANEL_CLASS}__stepper-row" data-lh-key>
        <span class="${SETTINGS_PANEL_CLASS}__stepper-label">Line Height</span>
        <div class="${SETTINGS_PANEL_CLASS}__stepper">
            <button type="button" class="${SETTINGS_PANEL_CLASS}__stepper-btn" data-lh-step="-0.1">−</button>
            <input type="text" class="${SETTINGS_PANEL_CLASS}__stepper-input" data-lh-value value="${value.toFixed(1)}">
            <button type="button" class="${SETTINGS_PANEL_CLASS}__stepper-btn" data-lh-step="0.1">+</button>
        </div>
    </div>`;

const buildDropdownHTML = (key: string, label: string, options: readonly { label: string; value: string }[], currentValue: string) => {
    const current = options.find(o => o.value === currentValue) ?? options[0];
    return `<div class="${SETTINGS_PANEL_CLASS}__dropdown-row">
        <span class="${SETTINGS_PANEL_CLASS}__dropdown-label">${label}</span>
        <button type="button" class="${SETTINGS_PANEL_CLASS}__dropdown-trigger" data-dropdown-trigger data-dropdown-key="${key}">
            <span class="${SETTINGS_PANEL_CLASS}__dropdown-value">${current.label}</span>
            <span class="codicon codicon-chevron-down ${SETTINGS_PANEL_CLASS}__dropdown-chevron" aria-hidden="true"></span>
        </button>
    </div>`;
};


export const buildSettingsPanelHTML = (vditor: IVditor) => {
    const uiSize = getGlobalLocalStorageSetting<number>(UI_FONT_SIZE_KEY, UI_FONT_SIZE_DEFAULT);
    const editorSize = getGlobalLocalStorageSetting<number>(EDITOR_FONT_SIZE_KEY, EDITOR_FONT_SIZE_DEFAULT);
    const lineHeight = getGlobalLocalStorageSetting<number>(LINE_HEIGHT_KEY, LINE_HEIGHT_DEFAULT);
    const fontFamily = getGlobalLocalStorageSetting<string>(FONT_FAMILY_KEY, FONT_FAMILY_OPTIONS[0].value);
    const boldColor = getGlobalLocalStorageSetting<string>(BOLD_COLOR_KEY, BOLD_COLOR_OPTIONS[0].value);
    return `<div class="${SETTINGS_PANEL_CLASS}">
        <div class="${SETTINGS_PANEL_CLASS}__section">
            <div class="${SETTINGS_PANEL_CLASS}__title">Edit Mode</div>
            ${buildEditModeSegmentedHTML(vditor.currentMode)}
        </div>
        <div class="${SETTINGS_PANEL_CLASS}__section">
            <div class="${SETTINGS_PANEL_CLASS}__title">Font Size</div>
            <div class="${SETTINGS_PANEL_CLASS}__group">
                ${buildFontSizeStepperHTML(UI_FONT_SIZE_KEY, "UI", uiSize)}
                ${buildFontSizeStepperHTML(EDITOR_FONT_SIZE_KEY, "Editor", editorSize)}
            </div>
        </div>
        <div class="${SETTINGS_PANEL_CLASS}__section">
            <div class="${SETTINGS_PANEL_CLASS}__title">Typography</div>
            <div class="${SETTINGS_PANEL_CLASS}__group">
                ${buildLineHeightStepperHTML(lineHeight)}
                ${buildDropdownHTML(FONT_FAMILY_KEY, "Font", FONT_FAMILY_OPTIONS, fontFamily)}
                ${buildDropdownHTML(BOLD_COLOR_KEY, "Bold", BOLD_COLOR_OPTIONS, boldColor)}
            </div>
        </div>
        <div class="${SETTINGS_PANEL_CLASS}__footer">
            <button type="button" class="${SETTINGS_PANEL_CLASS}__reset-btn" data-reset-settings>Reset to Defaults</button>
        </div>
    </div>`;
};

export const refreshSettingsPanel = (panelElement: HTMLElement, vditor: IVditor) => {
    for (const button of panelElement.querySelectorAll(`.${SETTINGS_PANEL_CLASS}__segment[data-mode]`)) {
        const mode = button.getAttribute("data-mode") || "";
        const isCurrent = mode === vditor.currentMode;
        button.classList.toggle(`${SETTINGS_PANEL_CLASS}__segment--current`, isCurrent);
        button.setAttribute("aria-pressed", String(isCurrent));
    }
};

export const refreshSettingsToolbarPanel = (vditor: IVditor) => {
    const settingsItem = vditor.toolbar.elements.settings;
    if (!settingsItem) return;
    const panelElement = settingsItem.querySelector(".vditor-hint") as HTMLElement | null;
    if (!panelElement || panelElement.style.display !== "block") return;
    refreshSettingsPanel(panelElement, vditor);
};
