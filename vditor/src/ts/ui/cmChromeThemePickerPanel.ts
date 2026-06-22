import {
    CM_CHROME_THEME_PANEL_CLASS,
    buildThemePickerPanelHTML,
    refreshThemePickerPanel,
} from "./themePickerPanel";

export {CM_CHROME_THEME_PANEL_CLASS};

export const CM_CHROME_THEME_POPOVER_CLASS = "vditor-cm-chrome-theme-popover";

export const buildCmChromeThemePickerPanelHTML = (
    groups: Parameters<typeof buildThemePickerPanelHTML>[0],
    currentTheme: string,
    formatLabel?: (themeId: string) => string,
) => {
    return buildThemePickerPanelHTML(groups, currentTheme, formatLabel, CM_CHROME_THEME_PANEL_CLASS);
};

export const queryCmChromeThemePickerPanel = (container: ParentNode) => {
    return container.querySelector(`.${CM_CHROME_THEME_PANEL_CLASS}`) as HTMLElement | null;
};

export const refreshCmChromeThemePickerPanel = refreshThemePickerPanel;
