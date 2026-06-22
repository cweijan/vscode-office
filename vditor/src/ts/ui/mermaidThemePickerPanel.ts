import {
    MERMAID_THEME_PANEL_CLASS,
    buildThemePickerPanelHTML,
    refreshThemePickerPanel,
} from "./themePickerPanel";

export {MERMAID_THEME_PANEL_CLASS};

export const buildMermaidThemePickerPanelHTML = (
    groups: Parameters<typeof buildThemePickerPanelHTML>[0],
    currentTheme: string,
    formatLabel?: (themeId: string) => string,
) => {
    return buildThemePickerPanelHTML(groups, currentTheme, formatLabel, MERMAID_THEME_PANEL_CLASS);
};

export const refreshMermaidThemePickerPanel = refreshThemePickerPanel;
