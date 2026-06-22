export const EDIT_MODE_PANEL_CLASS = "vditor-edit-mode-panel";

const EDIT_MODES = [
    {id: "wysiwyg", labelKey: "wysiwyg", descKey: "edit-mode-wysiwyg-desc"},
    {id: "ir", labelKey: "instantRendering", descKey: "edit-mode-ir-desc"},
] as const;

export const buildEditModePickerPanelHTML = (currentMode: string) => {
    const resolvedMode = currentMode === "sv" ? "ir" : currentMode;
    let innerHTML = `<div class="${EDIT_MODE_PANEL_CLASS}">`;
    innerHTML += `<div class="${EDIT_MODE_PANEL_CLASS}__section">`;
    for (const mode of EDIT_MODES) {
        const label = window.VditorI18n[mode.labelKey] || mode.labelKey;
        const desc = window.VditorI18n[mode.descKey] || "";
        const currentClass = mode.id === resolvedMode ? " vditor-edit-mode-option--current" : "";
        innerHTML += `<button type="button" class="vditor-edit-mode-panel__option${currentClass}" data-mode="${mode.id}">`;
        innerHTML += `<span class="vditor-edit-mode-panel__label">${label}</span>`;
        if (desc) {
            innerHTML += `<span class="vditor-edit-mode-panel__desc">${desc}</span>`;
        }
        innerHTML += `</button>`;
    }
    innerHTML += `</div></div>`;
    return innerHTML;
};

export const queryEditModePickerPanel = (host: ParentNode) => {
    return host.querySelector(`.${EDIT_MODE_PANEL_CLASS}`) as HTMLElement | null;
};

export const refreshEditModePickerPanel = (panelRoot: HTMLElement, currentMode: string) => {
    const resolvedMode = currentMode === "sv" ? "ir" : currentMode;
    for (const button of panelRoot.querySelectorAll("button[data-mode]")) {
        const mode = button.getAttribute("data-mode") || "";
        button.classList.toggle("vditor-edit-mode-option--current", mode === resolvedMode);
    }
};
