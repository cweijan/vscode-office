import {Constants} from "../constants";
import {CM_THEME_ATTR} from "./codeMirrorColorThemes";

const resolveRoot = (root?: HTMLElement): HTMLElement | null => {
    if (root) {
        return root;
    }
    return document.getElementById("vditor") ?? document.querySelector(".vditor");
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

    if (codeTheme === "default") {
        document.documentElement.removeAttribute(CM_THEME_ATTR);
        element.removeAttribute(CM_THEME_ATTR);
        return;
    }

    document.documentElement.setAttribute(CM_THEME_ATTR, codeTheme);
    element.setAttribute(CM_THEME_ATTR, codeTheme);
};
