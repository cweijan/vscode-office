export interface IThemePickerGroup {
    titleKey: string;
    themes: string[];
}

export const buildThemePickerPanelHTML = (
    groups: IThemePickerGroup[],
    currentTheme: string,
    formatLabel?: (themeId: string) => string,
) => {
    const label = formatLabel ?? ((themeId: string) => themeId);
    let innerHTML = `<div class="vditor-cm-theme-panel" style="overflow: auto;max-height:${window.innerHeight / 2}px">`;
    for (const group of groups) {
        const title = window.VditorI18n[group.titleKey] || group.titleKey;
        innerHTML += `<div class="vditor-cm-theme-panel__section">`;
        innerHTML += `<div class="vditor-cm-theme-panel__title">${title}</div>`;
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
