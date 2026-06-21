export const CM_THEME_ATTR = "data-cm-theme";
export const CM_THEME_AUTO = "Auto";

/** Follow VS Code / editor theme colors. */
export interface ICodeMirrorThemeGroup {
    titleKey: string;
    themes: string[];
}

export const CM_THEME_GROUPS: ICodeMirrorThemeGroup[] = [
    {
        titleKey: "code-theme-section-system",
        themes: [CM_THEME_AUTO],
    },
    {
        titleKey: "code-theme-section-light",
        themes: ["Github", "Solarized Light", "Material Light", "Quiet Light", "One Light"],
    },
    {
        titleKey: "code-theme-section-dark",
        themes: ["Dracula", "Monokai", "One Dark", "Solarized Dark", "Material Dark"],
    },
];

export const CM_THEME_IDS: string[] = CM_THEME_GROUPS.flatMap((group) => group.themes);
