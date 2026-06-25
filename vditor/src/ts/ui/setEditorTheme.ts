import {refreshMermaidTheme} from "../markdown/mermaidRender";
import {
    EDITOR_DARK_THEMES,
    EDITOR_THEME_IDS,
    resolveEditorTheme,
} from "./editorThemeCatalog";
import {resolveMermaidTheme} from "./setMermaidTheme";
import {updateEditorThemeToggle} from "./editorThemeToggle";
import {initMobileOutlineMenu, prepareEditorThemeMobileOutline} from "./mobileOutlineMenu";
import {telemetry} from "../util/telemetry";

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
            if (resolveMermaidTheme(vditor.options) === "Auto") {
                refreshMermaidTheme(vditor.element, vditor.options.cdn, vditor);
            }
        }
    });
    observer.observe(document.body, {attributes: true, attributeFilter: ["data-vscode-theme-kind"]});
};

/** Apply bundled editor theme via data-editor-theme (css bundled in index.css). */
export const setEditorTheme = (
    vditor: IVditor,
    theme: string,
    notify = true,
    telemetryKind: "editor" | "toggle" = "editor",
) => {
    const resolved = resolveEditorTheme(theme);
    if (!EDITOR_THEME_IDS.includes(resolved)) {
        return;
    }
    const previous = resolveEditorTheme(vditor.options.editorTheme);

    applyEditorThemeAttribute(vditor, resolved);
    vditor.options.editorTheme = resolved;
    syncEditorDarkClass(vditor.element, resolved);
    updateEditorThemeToggle(resolved);
    observeVscodeTheme(vditor);
    if (resolveMermaidTheme(vditor.options) === "Auto") {
        refreshMermaidTheme(vditor.element, vditor.options.cdn, vditor);
    }

    if (notify) {
        if (resolved !== previous) {
            const event = telemetryKind === "toggle"
                ? "markdown.theme.toggle"
                : "markdown.theme.editor";
            telemetry(vditor, event, { theme: resolved });
        }
        if (vditor.options.changeEditorTheme) {
            vditor.options.changeEditorTheme(resolved);
        }
    }
};

export const initEditorTheme = (vditor: IVditor) => {
    const theme = resolveEditorTheme(vditor.options.editorTheme);
    setEditorTheme(vditor, theme, false);
    initMobileOutlineMenu(vditor);
};

export {resolveEditorTheme};
