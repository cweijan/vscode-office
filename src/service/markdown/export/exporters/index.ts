import path from 'path';
import { exportDocxFromHtml } from './exportDocx';
import { exportPdfFromHtml } from './exportPdf';
import { writeHtmlFile } from './writeHtml';
import { logExportInfo } from '../log';
import type { ExportConfig } from '../types';

export async function exportHtmlFromDocument(markdownFilePath: string, html: string): Promise<string> {
    const originPath = path.parse(markdownFilePath);
    const targetFilePath = path.join(originPath.dir, `${originPath.name}.html`);
    writeHtmlFile(targetFilePath, html);
    return targetFilePath;
}

/** Dispatch export to PDF, HTML, or DOCX based on config.type. */
export async function exportDocument(markdownFilePath: string, html: string, config: ExportConfig): Promise<string> {
    const { type } = config;
    logExportInfo(`Exporting as ${type} ...`);

    if (type === 'html') {
        return exportHtmlFromDocument(markdownFilePath, html);
    }
    if (type === 'docx') {
        return exportDocxFromHtml(markdownFilePath, html, config);
    }
    return exportPdfFromHtml(markdownFilePath, html, config);
}
