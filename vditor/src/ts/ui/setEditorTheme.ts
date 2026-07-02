import {refreshMermaidTheme} from "../markdown/mermaidRender";
import {
    DEFAULT_DARK_EDITOR_THEME,
    DEFAULT_LIGHT_EDITOR_THEME,
    EDITOR_DARK_THEMES,
    EDITOR_THEME_IDS,
    resolveEditorTheme,
} from "./editorThemeCatalog";
import {resolveMermaidTheme} from "./setMermaidTheme";
import {updateEditorThemeToggle} from "./editorThemeToggle";
import {initMobileOutlineMenu, prepareEditorThemeMobileOutline} from "./mobileOutlineMenu";
import {
    getGlobalLocalStorageSetting,
    LAST_DARK_EDITOR_THEME_KEY,
    LAST_LIGHT_EDITOR_THEME_KEY,
    LAST_NON_AUTO_EDITOR_THEME_KEY,
    setGlobalLocalStorageSetting,
} from "../util/globalLocalStorageSettings";

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

const resolveStoredManualTheme = (
    key: string,
    fallback: string,
    legacyFallback: string,
) => {
    const stored = resolveEditorTheme(
        getGlobalLocalStorageSetting<string>(key, fallback) ?? fallback,
    );
    return stored === "Auto" ? legacyFallback : stored;
};

export const syncEditorDarkClass = (element: HTMLElement, theme: string) => {
    const useDark = theme === "Auto" ? isVscodeDarkTheme() : EDITOR_DARK_THEMES.has(theme);
    element.classList.toggle("vditor--dark", useDark);
};

export const resolvePreferredManualEditorTheme = (vditor: IVditor, preferDark: boolean) => {
    const fallback = preferDark ? DEFAULT_DARK_EDITOR_THEME : DEFAULT_LIGHT_EDITOR_THEME;
    const candidate = preferDark
        ? resolveEditorTheme(vditor.options.lastDarkEditorTheme || fallback)
        : resolveEditorTheme(vditor.options.lastLightEditorTheme || fallback);
    return candidate === "Auto" ? fallback : candidate;
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
    if (resolved !== "Auto") {
        vditor.options.lastNonAutoEditorTheme = resolved;
        setGlobalLocalStorageSetting(LAST_NON_AUTO_EDITOR_THEME_KEY, resolved);
        if (EDITOR_DARK_THEMES.has(resolved)) {
            vditor.options.lastDarkEditorTheme = resolved;
            setGlobalLocalStorageSetting(LAST_DARK_EDITOR_THEME_KEY, resolved);
        } else {
            vditor.options.lastLightEditorTheme = resolved;
            setGlobalLocalStorageSetting(LAST_LIGHT_EDITOR_THEME_KEY, resolved);
        }
    }

    applyEditorThemeAttribute(vditor, resolved);
    vditor.options.editorTheme = resolved;
    syncEditorDarkClass(vditor.element, resolved);
    updateEditorThemeToggle(resolved);
    observeVscodeTheme(vditor);
    if (resolveMermaidTheme(vditor.options) === "Auto") {
        refreshMermaidTheme(vditor.element, vditor.options.cdn, vditor);
    }

    if (notify) {
        if (vditor.options.changeEditorTheme) {
            vditor.options.changeEditorTheme(resolved);
        }
    }
};

export const initEditorTheme = (vditor: IVditor) => {
    const storedLastTheme = resolveEditorTheme(
        getGlobalLocalStorageSetting<string>(LAST_NON_AUTO_EDITOR_THEME_KEY, DEFAULT_LIGHT_EDITOR_THEME) ?? DEFAULT_LIGHT_EDITOR_THEME,
    );
    const normalizedLastTheme = storedLastTheme === "Auto" ? DEFAULT_LIGHT_EDITOR_THEME : storedLastTheme;
    vditor.options.lastNonAutoEditorTheme = normalizedLastTheme;
    vditor.options.lastLightEditorTheme = resolveStoredManualTheme(
        LAST_LIGHT_EDITOR_THEME_KEY,
        DEFAULT_LIGHT_EDITOR_THEME,
        EDITOR_DARK_THEMES.has(normalizedLastTheme) ? DEFAULT_LIGHT_EDITOR_THEME : normalizedLastTheme,
    );
    vditor.options.lastDarkEditorTheme = resolveStoredManualTheme(
        LAST_DARK_EDITOR_THEME_KEY,
        DEFAULT_DARK_EDITOR_THEME,
        EDITOR_DARK_THEMES.has(normalizedLastTheme) ? normalizedLastTheme : DEFAULT_DARK_EDITOR_THEME,
    );
    const theme = resolveEditorTheme(vditor.options.editorTheme);
    setEditorTheme(vditor, theme, false);
    initMobileOutlineMenu(vditor);
};

export {resolveEditorTheme};
