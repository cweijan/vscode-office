import { IVditor } from "../../types";
import {
    CODE_FONT_FAMILY_KEY,
    EDITOR_FONT_SIZE_DEFAULT,
    EDITOR_FONT_SIZE_KEY,
    FONT_FAMILY_KEY,
    getGlobalLocalStorageSetting,
    LINE_HEIGHT_DEFAULT,
    LINE_HEIGHT_KEY,
    PAGE_WIDTH_DEFAULT,
    PAGE_WIDTH_KEY,
    exportViewerSettings,
} from "./globalLocalStorageSettings";

const EXPORT_CSS_VARS = [
    "--bg-color",
    "--front-color",
    "--second-color",
    "--second-bg-color",
    "--link-color",
    "--wikilink-color",
    "--list-hover-color",
    "--blockquote-color",
    "--blockquote-border",
    "--blockquote-bg",
    "--table-border",
    "--table-row-border",
    "--table-header-bg",
    "--table-body-bg",
    "--code-bg-color",
    "--code-fg-color",
    "--hr-bg",
    "--border-color",
    "--editor-font-size",
    "--editor-line-height",
    "--editor-font-family",
    "--code-font-family",
    "--bold-color",
    "--vditor-page-width",
    "--vditor-image-max-width",
    "--vditor-image-max-height",
    "--cm-bg-color",
    "--cm-fg-color",
    "--cm-syntax-comment",
    "--cm-syntax-keyword",
    "--cm-syntax-string",
    "--cm-syntax-number",
    "--cm-syntax-atom",
    "--cm-syntax-property",
    "--cm-syntax-attribute",
    "--cm-syntax-variable",
    "--cm-syntax-def",
    "--cm-syntax-bracket",
    "--cm-syntax-tag",
    "--cm-syntax-link",
    "--cm-syntax-error",
] as const;

export type CodeThemeColors = {
    bg: string;
    fg: string;
    comment: string;
    keyword: string;
    string: string;
    number: string;
    atom: string;
    property: string;
    attribute: string;
    variable: string;
    def: string;
    bracket: string;
    tag: string;
    link: string;
    error: string;
};

export type ExportLayoutSettings = {
    fontSize: string;
    fontFamily: string;
    lineHeight: string;
    pageWidth: string;
    codeFontFamily: string;
};

export type ExportThemeSettings = {
    editorTheme: string;
    isDark: boolean;
    codeMirrorTheme?: string;
    mermaidTheme?: string;
    globalSettings: Record<string, boolean | number | string | undefined>;
    cssVariables: Record<string, string>;
    layout: ExportLayoutSettings;
    codeThemeColors?: CodeThemeColors;
};

const resolveContentElement = (vditor: IVditor): HTMLElement => {
    return vditor.element.querySelector<HTMLElement>(".vditor-ir")
        || vditor.element.querySelector<HTMLElement>(".vditor-wysiwyg")
        || vditor.element;
};

const readCssVar = (element: HTMLElement, name: string): string => {
    return getComputedStyle(element).getPropertyValue(name).trim();
};

const resolveFontFamily = (raw: string | undefined, contentStyle: CSSStyleDeclaration): string => {
    if (raw && raw !== "inherit") {
        return raw;
    }
    return contentStyle.fontFamily || "inherit";
};

const resolvePageWidth = (
    stored: string | undefined,
    root: HTMLElement,
    contentStyle: CSSStyleDeclaration,
): string => {
    if (stored) {
        return stored;
    }
    const fromVar = readCssVar(root, "--vditor-page-width");
    if (fromVar) {
        return fromVar;
    }
    const maxWidth = contentStyle.maxWidth;
    if (maxWidth && maxWidth !== "none") {
        return maxWidth;
    }
    return PAGE_WIDTH_DEFAULT;
};

const collectLayoutSettings = (vditor: IVditor): ExportLayoutSettings => {
    const root = vditor.element;
    const content = resolveContentElement(vditor);
    const contentStyle = getComputedStyle(content);
    const globalSettings = exportViewerSettings().globalSettings;

    const editorFontSize = globalSettings[EDITOR_FONT_SIZE_KEY] ?? getGlobalLocalStorageSetting<number>(EDITOR_FONT_SIZE_KEY);
    const fontSize = editorFontSize != null
        ? `${editorFontSize}px`
        : (readCssVar(root, "--editor-font-size") || contentStyle.fontSize || `${EDITOR_FONT_SIZE_DEFAULT}px`);

    const storedFontFamily = globalSettings[FONT_FAMILY_KEY] ?? getGlobalLocalStorageSetting<string>(FONT_FAMILY_KEY);
    const fontFamily = resolveFontFamily(
        (typeof storedFontFamily === "string" ? storedFontFamily : undefined)
        ?? readCssVar(root, "--editor-font-family"),
        contentStyle,
    );

    const storedLineHeight = globalSettings[LINE_HEIGHT_KEY] ?? getGlobalLocalStorageSetting<number>(LINE_HEIGHT_KEY);
    const lineHeight = typeof storedLineHeight === "number"
        ? String(storedLineHeight)
        : (readCssVar(root, "--editor-line-height") || contentStyle.lineHeight || String(LINE_HEIGHT_DEFAULT));

    const storedPageWidth = globalSettings[PAGE_WIDTH_KEY] ?? getGlobalLocalStorageSetting<string>(PAGE_WIDTH_KEY);
    const pageWidth = resolvePageWidth(
        typeof storedPageWidth === "string" ? storedPageWidth : undefined,
        root,
        contentStyle,
    );

    const storedCodeFontFamily = globalSettings[CODE_FONT_FAMILY_KEY] ?? getGlobalLocalStorageSetting<string>(CODE_FONT_FAMILY_KEY);
    const codeFontFamilyRaw = (typeof storedCodeFontFamily === "string" ? storedCodeFontFamily : undefined)
        ?? readCssVar(root, "--code-font-family");
    const codeFontFamily = codeFontFamilyRaw && codeFontFamilyRaw !== "inherit"
        ? codeFontFamilyRaw
        : (readCssVar(root, "--vscode-editor-font-family") || "mononoki, Consolas, \"Liberation Mono\", Menlo, Courier, monospace");

    return { fontSize, fontFamily, lineHeight, pageWidth, codeFontFamily };
};

const collectCssVariables = (element: HTMLElement): Record<string, string> => {
    const sources = [element, document.documentElement];
    const vars: Record<string, string> = {};
    for (const name of EXPORT_CSS_VARS) {
        for (const source of sources) {
            const value = getComputedStyle(source).getPropertyValue(name).trim();
            if (value && !vars[name]) {
                vars[name] = value;
            }
        }
    }
    return vars;
};

const collectCodeThemeColors = (vditor: IVditor): CodeThemeColors => {
    const root = vditor.element;
    const probe = document.createElement("div");
    probe.className = "vditor-cm-host";
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;visibility:hidden;pointer-events:none;";

    const cmEditor = document.createElement("div");
    cmEditor.className = "cm-editor";
    const cmContent = document.createElement("div");
    cmContent.className = "cm-content";

    const tokenClasses = [
        "cm-comment",
        "cm-keyword",
        "cm-string",
        "cm-number",
        "cm-atom",
        "cm-property",
        "cm-attribute",
        "cm-variable",
        "cm-def",
        "cm-bracket",
        "cm-tag",
        "cm-link",
        "cm-error",
    ] as const;

    const spans: Record<string, HTMLSpanElement> = {};
    for (const className of tokenClasses) {
        const span = document.createElement("span");
        span.className = className;
        span.textContent = "x";
        cmContent.appendChild(span);
        spans[className] = span;
    }

    cmEditor.appendChild(cmContent);
    probe.appendChild(cmEditor);
    root.appendChild(probe);

    const readColor = (className: string) => getComputedStyle(spans[className]).color;

    const colors: CodeThemeColors = {
        bg: readCssVar(root, "--cm-bg-color") || readCssVar(root, "--code-bg-color") || "#f6f8fa",
        fg: readCssVar(root, "--cm-fg-color") || readCssVar(root, "--code-fg-color") || readColor("cm-variable"),
        comment: readColor("cm-comment"),
        keyword: readColor("cm-keyword"),
        string: readColor("cm-string"),
        number: readColor("cm-number"),
        atom: readColor("cm-atom"),
        property: readColor("cm-property"),
        attribute: readColor("cm-attribute"),
        variable: readColor("cm-variable"),
        def: readColor("cm-def"),
        bracket: readColor("cm-bracket"),
        tag: readColor("cm-tag"),
        link: readColor("cm-link"),
        error: readColor("cm-error"),
    };

    probe.remove();
    return colors;
};

export const exportExportSettings = (vditor: IVditor): ExportThemeSettings => ({
    editorTheme: vditor.options.editorTheme || "Auto",
    isDark: vditor.element.classList.contains("vditor--dark"),
    codeMirrorTheme: vditor.options.codeMirrorTheme,
    mermaidTheme: vditor.options.mermaidTheme,
    globalSettings: exportViewerSettings().globalSettings,
    cssVariables: collectCssVariables(vditor.element),
    layout: collectLayoutSettings(vditor),
    codeThemeColors: collectCodeThemeColors(vditor),
});
