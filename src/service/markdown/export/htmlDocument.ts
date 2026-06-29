import path from 'path';
import mustache from 'mustache';
import { Uri } from 'vscode';
import { loadExportStyles, resolveBodyExportClass } from './styleLoader';
import { readTextFile, resolveExportTemplatePath } from './paths';
import { logExportError } from './log';
import type { ExportConfig, ExportType } from './types';

const PRINT_TOC_HIDE_STYLE = `<style>
@media print {
    .table-of-contents {
        display: none !important;
    }
}
</style>`;

function buildHtmlTopMarginStyle(type: ExportType, config: ExportConfig): string {
    if (type !== 'html') {
        return '';
    }
    const top = config.margin?.top;
    if (top == null || top < 0) {
        return '';
    }
    return `<style>
body {
    padding-top: ${top}px;
}
</style>`;
}

export function buildHtmlDocument(
    content: string,
    markdownFilePath: string,
    type: ExportType,
    config: ExportConfig,
    options?: { autoInsertedToc?: boolean },
): string {
    try {
        const title = path.basename(markdownFilePath);
        let style = loadExportStyles(type, config);
        if (options?.autoInsertedToc) {
            style += PRINT_TOC_HIDE_STYLE;
        }
        style += buildHtmlTopMarginStyle(type, config);
        const templatePath = resolveExportTemplatePath();
        const bodyClass = resolveBodyExportClass(config);
        return mustache.render(readTextFile(templatePath), { title, style, content, bodyClass });
    } catch (error) {
        logExportError('buildHtmlDocument()', error);
        return '';
    }
}

export function buildHtmlDocumentFromUri(
    content: string,
    uri: Uri,
    type: ExportType,
    config: ExportConfig,
    options?: { autoInsertedToc?: boolean },
): string {
    return buildHtmlDocument(content, uri.fsPath, type, config, options);
}
