import { writeFileSync } from 'fs';
import path from 'path';
import { buildDocxDocumentOptions } from '../docx/documentOptions';
import { rasterizeDynamicContentForDocx } from './rasterizeForDocx';
import { logExportInfo } from '../log';
import type { ExportConfig } from '../types';

export async function exportDocxFromHtml(markdownFilePath: string, html: string, config: ExportConfig): Promise<string> {
    const originPath = path.parse(markdownFilePath);
    const targetFilePath = path.join(originPath.dir, `${originPath.name}.docx`);

    const preparedHtml = await rasterizeDynamicContentForDocx(html, config, targetFilePath);
    const documentOptions = buildDocxDocumentOptions(config.exportTheme);
    const htmlToDocx = require('vscode-html-to-docx');
    const exportTask = await htmlToDocx(preparedHtml, '', documentOptions, '');
    const buffer = Buffer.from(await exportTask.arrayBuffer());
    writeFileSync(targetFilePath, buffer);
    logExportInfo(`Exported DOCX: ${targetFilePath}`);
    return targetFilePath;
}
