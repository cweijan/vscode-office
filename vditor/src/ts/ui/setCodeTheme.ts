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

/** Resolve CodeMirror theme from options (`codeMirrorTheme` takes precedence over `preview.hljs.style`). */
export const resolveCodeMirrorTheme = (options: {
    codeMirrorTheme?: string;
    preview: {hljs: {style: string}};
}) => {
    const theme = options.codeMirrorTheme ?? options.preview.hljs.style;
    return normalizeCodeMirrorThemeId(theme);
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
    vditor.options.preview.hljs.style = resolved;
    setCodeTheme(resolved, vditor.element);
    if (vditor.options.changeCodeTheme) {
        vditor.options.changeCodeTheme(resolved);
    }
    return resolved;
};
