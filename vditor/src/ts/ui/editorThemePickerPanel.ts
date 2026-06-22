import {
    EDITOR_THEME_PANEL_CLASS,
    buildThemePickerPanelHTML,
    refreshThemePickerPanel,
} from "./themePickerPanel";

export {EDITOR_THEME_PANEL_CLASS};

export const buildEditorThemePickerPanelHTML = (
    groups: Parameters<typeof buildThemePickerPanelHTML>[0],
    currentTheme: string,
    formatLabel?: (themeId: string) => string,
) => {
    return buildThemePickerPanelHTML(groups, currentTheme, formatLabel, EDITOR_THEME_PANEL_CLASS);
};

export const queryEditorThemePickerPanel = (container: ParentNode) => {
    return container.querySelector(`.${EDITOR_THEME_PANEL_CLASS}`) as HTMLElement | null;
};

export const refreshEditorThemePickerPanel = refreshThemePickerPanel;
