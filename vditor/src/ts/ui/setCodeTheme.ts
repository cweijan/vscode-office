import {Constants} from "../constants";
import {CM_COLOR_THEMES, CM_THEME_ATTR, CM_THEME_VAR_KEYS} from "./codeMirrorColorThemes";

const resolveRoot = (root?: HTMLElement): HTMLElement | null => {
    if (root) {
        return root;
    }
    return document.getElementById("vditor") ?? document.querySelector(".vditor");
};

const clearCodeThemeVars = (element: HTMLElement) => {
    for (const key of CM_THEME_VAR_KEYS) {
        element.style.removeProperty(key);
    }
};

/** Resolve CodeMirror theme from options (`codeMirrorTheme` takes precedence over `preview.hljs.style`). */
export const resolveCodeMirrorTheme = (options: {
    codeMirrorTheme?: string;
    preview: {hljs: {style: string}};
}) => {
    const theme = options.codeMirrorTheme ?? options.preview.hljs.style;
    return Constants.CODE_THEME.includes(theme) ? theme : "default";
};

/** Apply CodeMirror syntax / chrome colors on the editor root element. */
export const setCodeTheme = (codeTheme: string, root?: HTMLElement) => {
    if (!Constants.CODE_THEME.includes(codeTheme)) {
        return;
    }

    const element = resolveRoot(root);
    if (!element) {
        return;
    }

    const themeVars = CM_COLOR_THEMES[codeTheme];
    if (!themeVars) {
        element.removeAttribute(CM_THEME_ATTR);
        clearCodeThemeVars(element);
        return;
    }

    element.setAttribute(CM_THEME_ATTR, codeTheme);
    clearCodeThemeVars(element);
    for (const [key, value] of Object.entries(themeVars)) {
        element.style.setProperty(key, value);
    }
};
