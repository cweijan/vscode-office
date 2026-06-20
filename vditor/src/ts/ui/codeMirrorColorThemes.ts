export const CM_THEME_ATTR = "data-cm-theme";

/** null = follow editor / VS Code theme (default). */
export interface ICodeMirrorThemeGroup {
    titleKey: string;
    themes: string[];
}

export const CM_THEME_GROUPS: ICodeMirrorThemeGroup[] = [
    {
        titleKey: "code-theme-section-system",
        themes: ["default"],
    },
    {
        titleKey: "code-theme-section-light",
        themes: ["github", "solarized-light", "material-light", "quiet-light", "one-light"],
    },
    {
        titleKey: "code-theme-section-dark",
        themes: ["dracula", "monokai", "one-dark", "solarized-dark", "material-dark"],
    },
];

export const CM_THEME_IDS: string[] = CM_THEME_GROUPS.flatMap((group) => group.themes);
