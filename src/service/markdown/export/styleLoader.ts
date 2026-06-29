import { buildExportThemeCss } from './theme/exportThemeCss';
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

export function usesProTheme(config: ExportConfig): boolean {
    return config.useProExport === true && !!config.exportTheme;
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

export function loadProExportStyles(type: ExportType, config: ExportConfig): string {
    const basePath = resolveStylesDirectory();
    let styles = loadCssBundle(PRO_STYLE_FILES, basePath, type, true);
    if (config.exportTheme) {
        styles += buildHljsThemeCss(config.exportTheme);
        styles += buildExportThemeCss(config.exportTheme);
    }
    return styles;
}

export function loadExportStyles(type: ExportType, config: ExportConfig): string {
    if (!usesProTheme(config)) {
        return loadLegacyExportStyles(type);
    }
    return loadProExportStyles(type, config);
}
