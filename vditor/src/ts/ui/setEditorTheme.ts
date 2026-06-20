import {addStyle} from "../util/addStyle";
import {
    EDITOR_DARK_THEMES,
    EDITOR_THEME_IDS,
    resolveEditorTheme,
} from "./editorThemeCatalog";
import {initEditorThemeToggle, updateEditorThemeToggle} from "./editorThemeToggle";

const EDITOR_BASE_CSS_ID = "vditor-editor-base-css";
const EDITOR_CODEMIRROR_CSS_ID = "vditor-editor-cm-css";
const EDITOR_THEME_LINK_ID = "vditor-editor-theme-css";

let vscodeThemeObserverStarted = false;

const getAssetRoot = (vditor: IVditor) => vditor.options.extPath ?? vditor.options.cdn;

const isVscodeDarkTheme = () => {
    const kind = document.body.getAttribute("data-vscode-theme-kind");
    if (kind === "vscode-dark" || kind === "vscode-high-contrast") {
        return true;
    }
    if (kind === "vscode-light" || kind === "vscode-high-contrast-light") {
        return false;
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
};

export const syncEditorDarkClass = (element: HTMLElement, theme: string) => {
    const useDark = theme === "Auto" ? isVscodeDarkTheme() : EDITOR_DARK_THEMES.has(theme);
    element.classList.toggle("vditor--dark", useDark);
};

const setThemeStylesheet = (vditor: IVditor, theme: string) => {
    const root = getAssetRoot(vditor);
    const href = `${root}/css/theme/${theme}.css`;
    let link = document.getElementById(EDITOR_THEME_LINK_ID) as HTMLLinkElement | null;
    if (!link) {
        link = document.createElement("link");
        link.id = EDITOR_THEME_LINK_ID;
        link.rel = "stylesheet";
        link.type = "text/css";
        document.head.appendChild(link);
    }
    if (link.getAttribute("href") !== href) {
        link.setAttribute("href", href);
    }
};

const observeVscodeTheme = (vditor: IVditor) => {
    if (vscodeThemeObserverStarted || typeof MutationObserver === "undefined") {
        return;
    }
    vscodeThemeObserverStarted = true;
    const observer = new MutationObserver(() => {
        const theme = vditor.element.getAttribute("data-editor-theme");
        if (theme === "Auto") {
            syncEditorDarkClass(vditor.element, "Auto");
        }
    });
    observer.observe(document.body, {attributes: true, attributeFilter: ["data-vscode-theme-kind"]});
};

export const ensureEditorThemeAssets = (vditor: IVditor) => {
    const root = getAssetRoot(vditor);
    addStyle(`${root}/css/base.css`, EDITOR_BASE_CSS_ID);
    addStyle(`${root}/css/codemirror.css`, EDITOR_CODEMIRROR_CSS_ID);
};

/** Apply markdown editor chrome theme (resource css/theme/*.css). */
export const setEditorTheme = (vditor: IVditor, theme: string, notify = true) => {
    const resolved = resolveEditorTheme(theme);
    if (!EDITOR_THEME_IDS.includes(resolved)) {
        return;
    }

    ensureEditorThemeAssets(vditor);
    setThemeStylesheet(vditor, resolved);
    vditor.options.editorTheme = resolved;
    vditor.element.setAttribute("data-editor-theme", resolved);
    syncEditorDarkClass(vditor.element, resolved);
    updateEditorThemeToggle(resolved);
    observeVscodeTheme(vditor);

    if (notify && vditor.options.changeEditorTheme) {
        vditor.options.changeEditorTheme(resolved);
    }
};

export const initEditorTheme = (vditor: IVditor) => {
    const theme = resolveEditorTheme(vditor.options.editorTheme);
    setEditorTheme(vditor, theme, false);
    initEditorThemeToggle(vditor);
};

export {resolveEditorTheme};
