import { buildExportThemeCss, type ExportThemeCssMode, LIGHT_THEME_VARS } from './theme/exportThemeCss';
import { buildHljsThemeCss } from './theme/codeTheme';
import {
    resolveKatexStylesPath,
    resolveStylesDirectory,
    wrapCssFile,
} from './paths';
import type { ExportConfig, ExportType } from './types';

const LEGACY_STYLE_FILES = [
    'arduino-light.css',
    'markdown-export-legacy.css',
    'markdown-obsidian-export-legacy.css',
    'markdown-pdf-export-legacy.css',
];

const PRO_STYLE_FILES = [
    'markdown.css',
    'markdown-pdf.css',
];

export type ExportStyleMode = 'legacy' | 'pro-light' | 'pro-theme';

export function resolveExportStyleMode(config: ExportConfig): ExportStyleMode {
    if (!config.useProExport) {
        return 'legacy';
    }
    if (config.useExportTheme) {
        return 'pro-theme';
    }
    return 'pro-light';
}

export function usesProExport(config: ExportConfig): boolean {
    return config.useProExport === true;
}

/** @deprecated Use usesProExport — Pro styling applies to both pro-light and pro-theme. */
export function usesProTheme(config: ExportConfig): boolean {
    return usesProExport(config);
}

export function resolveBodyExportClass(config: ExportConfig): string {
    const mode = resolveExportStyleMode(config);
    if (mode === 'legacy') {
        return '';
    }
    if (mode === 'pro-theme' && config.exportTheme?.isDark) {
        return ' class="vditor-export vditor-export--dark"';
    }
    return ' class="vditor-export"';
}

function loadCssBundle(files: string[], basePath: string, type: ExportType, includeKatex: boolean): string {
    let styles = '';
    for (const file of files) {
        styles += wrapCssFile(`${basePath}/${file}`);
    }
    if (includeKatex) {
        styles += wrapCssFile(resolveKatexStylesPath(), true, type);
    }
    return styles;
}

export function loadLegacyExportStyles(type: ExportType): string {
    const basePath = resolveStylesDirectory();
    return loadCssBundle(LEGACY_STYLE_FILES, basePath, type, true);
}

export function loadProExportStyles(type: ExportType, config: ExportConfig, themeMode: ExportThemeCssMode): string {
    const basePath = resolveStylesDirectory();
    let styles = loadCssBundle(PRO_STYLE_FILES, basePath, type, true);
    const baseExportTheme = config.exportTheme || {
        editorTheme: 'Light',
        isDark: false,
        codeMirrorTheme: 'Github',
        mermaidTheme: 'Auto',
        globalSettings: {},
        cssVariables: {},
        layout: {
            fontSize: '',
            fontFamily: '',
            lineHeight: '',
            pageWidth: '',
            codeFontFamily: '',
        },
    };

    const exportTheme = themeMode === 'light-body'
        ? {
            ...baseExportTheme,
            isDark: false,
            cssVariables: { ...LIGHT_THEME_VARS },
            codeMirrorTheme: 'Github',
            codeThemeColors: undefined,
        }
        : baseExportTheme;

    styles += buildHljsThemeCss(exportTheme);
    styles += buildExportThemeCss(exportTheme, themeMode);
    return styles;
}

export function loadExportStyles(type: ExportType, config: ExportConfig): string {
    const mode = resolveExportStyleMode(config);
    if (mode === 'legacy') {
        return loadLegacyExportStyles(type);
    }
    if (mode === 'pro-theme') {
        return loadProExportStyles(type, config, 'full');
    }
    return loadProExportStyles(type, config, 'light-body');
}
