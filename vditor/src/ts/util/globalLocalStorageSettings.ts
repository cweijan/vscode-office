import { accessLocalStorage } from "./compatibility";

const GLOBAL_SETTINGS_STORAGE_KEY = "vditor-global-settings";

type GlobalLocalStorageSettings = {
    outlineEnable?: boolean;
    outlineWidth?: number;
    [key: string]: boolean | number | string | undefined;
};

const readGlobalSettings = (): GlobalLocalStorageSettings => {
    if (!accessLocalStorage()) {
        return {};
    }
    try {
        const raw = localStorage.getItem(GLOBAL_SETTINGS_STORAGE_KEY);
        if (!raw) {
            return {};
        }
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
        return {};
    }
};

const writeGlobalSettings = (settings: GlobalLocalStorageSettings) => {
    if (!accessLocalStorage()) {
        return;
    }
    try {
        localStorage.setItem(GLOBAL_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
        // ignore
    }
};

export const getGlobalLocalStorageSetting = <T extends GlobalLocalStorageSettings[keyof GlobalLocalStorageSettings]>(
    key: string,
    fallback?: T,
): T | undefined => {
    const settings = readGlobalSettings();
    const value = settings[key];
    return value === undefined ? fallback : value as T;
};

export const UI_FONT_SIZE_KEY = "uiFontSize";
export const EDITOR_FONT_SIZE_KEY = "editorFontSize";
export const UI_FONT_SIZE_DEFAULT = 13;
export const EDITOR_FONT_SIZE_DEFAULT = 16;
export const FONT_SIZE_MIN = 10;
export const FONT_SIZE_MAX = 24;

export const LINE_HEIGHT_KEY = "editorLineHeight";
export const FONT_FAMILY_KEY = "editorFontFamily";
export const BOLD_COLOR_KEY = "boldColor";

export const LINE_HEIGHT_MIN = 1.0;
export const LINE_HEIGHT_MAX = 3.0;
export const LINE_HEIGHT_DEFAULT = 1.7;

export const FONT_FAMILY_OPTIONS = [
    { label: "Default", value: "inherit" },
    { label: "Humanist", value: "Optima, Candara, 'Gill Sans', sans-serif" },
    { label: "Serif", value: "Georgia, 'Times New Roman', serif" },
    { label: "Old Style", value: "Palatino, 'Palatino Linotype', 'Book Antiqua', serif" },
    { label: "Garamond", value: "Garamond, 'EB Garamond', 'Cormorant Garamond', serif" },
    { label: "Charter", value: "Charter, 'Bitstream Charter', 'Sitka Text', serif" },
    { label: "Slab Serif", value: "Rockwell, Georgia, serif" },
    { label: "Narrow", value: "'Arial Narrow', 'Liberation Sans Narrow', sans-serif" },
    { label: "Mono", value: "Menlo, Monaco, Consolas, 'Liberation Mono', monospace" },
    { label: "JetBrains Mono", value: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', Consolas, monospace" },
    { label: "Courier", value: "'Courier New', Courier, monospace" },
] as const;

export const BOLD_COLOR_DEFAULT = "var(--front-color, #586069)";

export const BOLD_COLOR_OPTIONS = [
    { label: "Default", value: "inherit" },
    { label: "Bold", value: BOLD_COLOR_DEFAULT },
    { label: "Accent", value: "var(--link-color, #0550ae)" },
    { label: "Red", value: "var(--error-color, #cf222e)" },
    { label: "Orange", value: "#bc4c00" },
    { label: "Purple", value: "#8250df" },
    { label: "Teal", value: "#1a7f64" },
] as const;

export const IMAGE_MAX_WIDTH_KEY = "imageMaxWidth";
export const IMAGE_MAX_HEIGHT_KEY = "imageMaxHeight";
export const IMAGE_MAX_WIDTH_DEFAULT = 100;
export const IMAGE_MAX_HEIGHT_DEFAULT = 70;
export const IMAGE_MAX_WIDTH_MIN = 10;
export const IMAGE_MAX_WIDTH_MAX = 100;
export const IMAGE_MAX_HEIGHT_MIN = 10;
export const IMAGE_MAX_HEIGHT_MAX = 100;

export const AI_PROMPTS_KEY = "aiPrompts";
export const AI_ENGINE_KEY = "aiEngine";
export const AI_CUSTOM_URL_KEY = "aiCustomUrl";
export const AI_CUSTOM_KEY_KEY = "aiCustomKey";
export const AI_CUSTOM_MODEL_KEY = "aiCustomModel";

export interface AIPrompt {
    id: string;
    name: string;
    content: string;
}

export const getAIPrompts = (): AIPrompt[] => {
    const raw = getGlobalLocalStorageSetting<string>(AI_PROMPTS_KEY, "[]");
    try { return JSON.parse(raw as string) as AIPrompt[]; } catch { return []; }
};

export const setAIPrompts = (prompts: AIPrompt[]) => {
    setGlobalLocalStorageSetting(AI_PROMPTS_KEY, JSON.stringify(prompts));
};

export const applyEditorSettings = (vditorElement: HTMLElement) => {
    const uiSize = getGlobalLocalStorageSetting<number>(UI_FONT_SIZE_KEY);
    const editorSize = getGlobalLocalStorageSetting<number>(EDITOR_FONT_SIZE_KEY);
    const lineHeight = getGlobalLocalStorageSetting<number>(LINE_HEIGHT_KEY);
    const fontFamily = getGlobalLocalStorageSetting<string>(FONT_FAMILY_KEY);
    const boldColor = getGlobalLocalStorageSetting<string>(BOLD_COLOR_KEY, BOLD_COLOR_DEFAULT);
    const imgMaxWidth = getGlobalLocalStorageSetting<number>(IMAGE_MAX_WIDTH_KEY);
    const imgMaxHeight = getGlobalLocalStorageSetting<number>(IMAGE_MAX_HEIGHT_KEY);
    if (uiSize !== undefined) vditorElement.style.setProperty("--ui-font-size", `${uiSize}px`);
    if (editorSize !== undefined) vditorElement.style.setProperty("--editor-font-size", `${editorSize}px`);
    if (lineHeight !== undefined) vditorElement.style.setProperty("--editor-line-height", String(lineHeight));
    if (fontFamily !== undefined) vditorElement.style.setProperty("--editor-font-family", fontFamily);
    if (boldColor !== undefined) vditorElement.style.setProperty("--bold-color", boldColor);
    if (imgMaxWidth !== undefined) vditorElement.style.setProperty("--vditor-image-max-width", `${imgMaxWidth}%`);
    if (imgMaxHeight !== undefined) vditorElement.style.setProperty("--vditor-image-max-height", `${imgMaxHeight}vh`);

};

/** @deprecated use applyEditorSettings */
export const applyFontSizes = applyEditorSettings;

export const resetGlobalSettings = () => {
    if (!accessLocalStorage()) return;
    try { localStorage.removeItem(GLOBAL_SETTINGS_STORAGE_KEY); } catch { /* ignore */ }
};

export const setGlobalLocalStorageSetting = (
    key: string,
    value: GlobalLocalStorageSettings[keyof GlobalLocalStorageSettings],
) => {
    const settings = readGlobalSettings();
    if (value === undefined) {
        delete settings[key];
    } else {
        settings[key] = value;
    }
    writeGlobalSettings(settings);
};

