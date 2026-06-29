import { writeFileSync } from 'fs';
import { logExportInfo } from '../log';

export function writeHtmlFile(outputFilePath: string, html: string): void {
    logExportInfo(`Writing HTML: ${outputFilePath}`);
    writeFileSync(outputFilePath, html, 'utf-8');
}
