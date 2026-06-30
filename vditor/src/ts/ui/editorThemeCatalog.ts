export interface IEditorThemeGroup {
    titleKey: string;
    themes: string[];
}

export const EDITOR_THEME_GROUPS: IEditorThemeGroup[] = [
    {
        titleKey: "editor-theme-section-system",
        themes: ["Auto"],
    },
    {
        titleKey: "editor-theme-section-light",
        themes: ["Light", "Solarized", "Warm Light", "Dim Light"],
    },
    {
        titleKey: "editor-theme-section-dark",
        themes: ["One Dark", "Github Dark", "Nord", "Monokai", "Dracula"],
    },
];

export const EDITOR_THEME_IDS: string[] = EDITOR_THEME_GROUPS.flatMap((group) => group.themes);

export const EDITOR_DARK_THEMES = new Set([
    "One Dark",
    "Github Dark",
    "Nord",
    "Monokai",
    "Dracula",
]);

export const DEFAULT_LIGHT_EDITOR_THEME = "Light";
export const DEFAULT_DARK_EDITOR_THEME = "One Dark";

export const EDITOR_THEME_TOGGLE_NAMES = ["Auto", "Light"];

export const resolveEditorTheme = (theme?: string) => {
    if (theme && EDITOR_THEME_IDS.includes(theme)) {
        return theme;
    }
    return "Auto";
};
