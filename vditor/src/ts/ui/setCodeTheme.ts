import {Constants} from "../constants";
import {CM_THEME_ATTR, CM_THEME_AUTO} from "./codeMirrorColorThemes";

const resolveRoot = (root?: HTMLElement): HTMLElement | null => {
    if (root) {
        return root;
    }
    return document.getElementById("vditor") ?? document.querySelector(".vditor");
};

export const normalizeCodeMirrorThemeId = (theme?: string) => {
    if (!theme || theme === "default") {
        return CM_THEME_AUTO;
    }
    return Constants.CODE_THEME.includes(theme) ? theme : CM_THEME_AUTO;
};

/** Resolve CodeMirror theme from options. */
export const resolveCodeMirrorTheme = (options: {
    codeMirrorTheme?: string;
}) => {
    return normalizeCodeMirrorThemeId(options.codeMirrorTheme);
};

/** Apply CodeMirror syntax / chrome colors on the editor root element. */
export const setCodeTheme = (codeTheme: string, root?: HTMLElement) => {
    const theme = normalizeCodeMirrorThemeId(codeTheme);
    if (!Constants.CODE_THEME.includes(theme)) {
        return;
    }

    const element = resolveRoot(root);
    if (!element) {
        return;
    }

    document.documentElement.setAttribute(CM_THEME_ATTR, theme);
    element.setAttribute(CM_THEME_ATTR, theme);
};

export const applyCodeMirrorTheme = (vditor: IVditor, theme: string) => {
    const resolved = normalizeCodeMirrorThemeId(theme);
    vditor.options.codeMirrorTheme = resolved;
    setCodeTheme(resolved, vditor.element);
    if (vditor.options.changeCodeTheme) {
        vditor.options.changeCodeTheme(resolved);
    }
    return resolved;
};
