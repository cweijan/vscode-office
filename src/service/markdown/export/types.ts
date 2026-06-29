export type ExportType = 'pdf' | 'html' | 'docx';

export interface ExportLayoutSettings {
    fontSize: string;
    fontFamily: string;
    lineHeight: string;
    pageWidth: string;
    codeFontFamily: string;
}

export interface CodeThemeColors {
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
}

export interface ExportThemeSettings {
    editorTheme: string;
    isDark: boolean;
    codeMirrorTheme?: string;
    mermaidTheme?: string;
    globalSettings: Record<string, boolean | number | string | undefined>;
    cssVariables: Record<string, string>;
    layout: ExportLayoutSettings;
    codeThemeColors?: CodeThemeColors;
}

export interface ExportMargin {
    top?: number;
}

/** Runtime configuration passed from MarkdownService into the export pipeline. */
export interface ExportConfig {
    type: ExportType;
    withoutOutline?: boolean;
    printBackground?: boolean;
    format?: string;
    useProExport?: boolean;
    /** When Pro: apply full editor theme. When false: Pro styles with Light page background and body text. */
    useExportTheme?: boolean;
    exportTheme?: ExportThemeSettings;
    executablePath?: string;
    puppeteerArgs?: string[];
    breaks?: boolean;
    margin?: ExportMargin;
    debug?: boolean;
    /** Set by export pipeline when [toc] is auto-inserted for PDF. */
    autoInsertedToc?: boolean;
}

export interface ExportMarkdownRequest {
    markdownFilePath: string;
    config: ExportConfig;
}
