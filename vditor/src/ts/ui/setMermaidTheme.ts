import {refreshMermaidTheme} from "../markdown/mermaidRender";
import {
    MERMAID_THEME_ATTR,
    MERMAID_THEME_AUTO,
    MERMAID_THEME_IDS,
} from "./mermaidThemeCatalog";

const resolveRoot = (root?: HTMLElement): HTMLElement | null => {
    if (root) {
        return root;
    }
    return document.getElementById("vditor") ?? document.querySelector(".vditor");
};

export const normalizeMermaidThemeId = (theme?: string) => {
    if (!theme || theme === "default") {
        return MERMAID_THEME_AUTO;
    }
    const normalized = MERMAID_THEME_IDS.find((themeId) => themeId.toLowerCase() === theme.toLowerCase());
    if (normalized) {
        return normalized;
    }
    return MERMAID_THEME_IDS.includes(theme) ? theme : MERMAID_THEME_AUTO;
};

export const resolveMermaidTheme = (options: {mermaidTheme?: string}) => {
    return normalizeMermaidThemeId(options.mermaidTheme);
};

export const setMermaidThemeAttr = (theme: string, root?: HTMLElement) => {
    const resolved = normalizeMermaidThemeId(theme);
    const element = resolveRoot(root);
    if (element) {
        element.setAttribute(MERMAID_THEME_ATTR, resolved);
    }
    document.documentElement.setAttribute(MERMAID_THEME_ATTR, resolved);
};

export const applyMermaidTheme = (vditor: IVditor, theme: string, notify = true) => {
    const resolved = normalizeMermaidThemeId(theme);
    vditor.options.mermaidTheme = resolved;
    setMermaidThemeAttr(resolved, vditor.element);
    for (const host of vditor.element.querySelectorAll(".vditor-mermaid-host")) {
        host.setAttribute("data-mermaid-theme", resolved);
    }
    for (const panel of vditor.element.querySelectorAll(".vditor-mermaid-chrome__theme-panel")) {
        panel.setAttribute("data-mermaid-theme", resolved);
    }
    refreshMermaidTheme(vditor.element, vditor.options.cdn, vditor);
    if (notify && vditor.options.changeMermaidTheme) {
        vditor.options.changeMermaidTheme(resolved);
    }
    return resolved;
};

export const initMermaidTheme = (vditor: IVditor) => {
    const theme = resolveMermaidTheme(vditor.options);
    vditor.options.mermaidTheme = theme;
    setMermaidThemeAttr(theme, vditor.element);
};
