export interface IThemePickerGroup {
    titleKey: string;
    themes: string[];
}

export const EDITOR_THEME_PANEL_CLASS = "vditor-editor-theme-panel";
export const CM_CHROME_THEME_PANEL_CLASS = "vditor-cm-chrome-theme-panel";
export const MERMAID_THEME_PANEL_CLASS = "vditor-mermaid-theme-panel";

export const buildThemePickerPanelHTML = (
    groups: IThemePickerGroup[],
    currentTheme: string,
    formatLabel?: (themeId: string) => string,
    panelClass = EDITOR_THEME_PANEL_CLASS,
) => {
    const label = formatLabel ?? ((themeId: string) => themeId);
    let innerHTML = `<div class="${panelClass}">`;
    for (const group of groups) {
        const title = window.VditorI18n[group.titleKey] || group.titleKey;
        innerHTML += `<div class="${panelClass}__section">`;
        innerHTML += `<div class="${panelClass}__title">${title}</div>`;
        for (const theme of group.themes) {
            const currentAttr = theme === currentTheme ? ' class="vditor-theme-option--current"' : "";
            innerHTML += `<button type="button"${currentAttr} data-theme="${theme}">${label(theme)}</button>`;
        }
        innerHTML += `</div>`;
    }
    innerHTML += `</div>`;
    return innerHTML;
};

export const refreshThemePickerPanel = (panelRoot: HTMLElement, currentTheme: string) => {
    for (const button of panelRoot.querySelectorAll("button[data-theme]")) {
        const theme = button.getAttribute("data-theme") || "";
        button.classList.toggle("vditor-theme-option--current", theme === currentTheme);
    }
};
