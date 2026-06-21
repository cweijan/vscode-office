import {refreshMermaidTheme} from "../markdown/mermaidRender";
import {
    EDITOR_DARK_THEMES,
    EDITOR_THEME_IDS,
    resolveEditorTheme,
} from "./editorThemeCatalog";
import {initEditorThemeToggle, updateEditorThemeToggle} from "./editorThemeToggle";
import {initMobileOutlineMenu, prepareEditorThemeMobileOutline} from "./mobileOutlineMenu";

const LEGACY_THEME_LINK_ID = "vditor-editor-theme-css";

let vscodeThemeObserverStarted = false;

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

const applyEditorThemeAttribute = (vditor: IVditor, theme: string) => {
    document.documentElement.setAttribute("data-editor-theme", theme);
    vditor.element.setAttribute("data-editor-theme", theme);
    prepareEditorThemeMobileOutline(vditor);
    document.getElementById(LEGACY_THEME_LINK_ID)?.remove();
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
            refreshMermaidTheme(vditor.element, vditor.options.cdn);
        }
    });
    observer.observe(document.body, {attributes: true, attributeFilter: ["data-vscode-theme-kind"]});
};

/** Apply bundled editor theme via data-editor-theme (css bundled in index.css). */
export const setEditorTheme = (vditor: IVditor, theme: string, notify = true) => {
    const resolved = resolveEditorTheme(theme);
    if (!EDITOR_THEME_IDS.includes(resolved)) {
        return;
    }

    applyEditorThemeAttribute(vditor, resolved);
    vditor.options.editorTheme = resolved;
    syncEditorDarkClass(vditor.element, resolved);
    updateEditorThemeToggle(resolved);
    observeVscodeTheme(vditor);
    refreshMermaidTheme(vditor.element, vditor.options.cdn);

    if (notify && vditor.options.changeEditorTheme) {
        vditor.options.changeEditorTheme(resolved);
    }
};

export const initEditorTheme = (vditor: IVditor) => {
    const theme = resolveEditorTheme(vditor.options.editorTheme);
    setEditorTheme(vditor, theme, false);
    initEditorThemeToggle(vditor);
    initMobileOutlineMenu(vditor);
};

export {resolveEditorTheme};
