import path from 'path';
import mustache from 'mustache';
import { Uri } from 'vscode';
import { loadExportStyles, usesProTheme } from './styleLoader';
import { readTextFile, resolveExportTemplatePath } from './paths';
import { logExportError } from './log';
import type { ExportConfig, ExportType } from './types';

export function buildHtmlDocument(content: string, markdownFilePath: string, type: ExportType, config: ExportConfig): string {
    try {
        const title = path.basename(markdownFilePath);
        const style = loadExportStyles(type, config);
        const templatePath = resolveExportTemplatePath();
        const bodyClass = usesProTheme(config)
            ? ` class="vditor-export${config.exportTheme?.isDark ? ' vditor-export--dark' : ''}"`
            : '';
        return mustache.render(readTextFile(templatePath), { title, style, content, bodyClass });
    } catch (error) {
        logExportError('buildHtmlDocument()', error);
        return '';
    }
}

export function buildHtmlDocumentFromUri(content: string, uri: Uri, type: ExportType, config: ExportConfig): string {
    return buildHtmlDocument(content, uri.fsPath, type, config);
}
