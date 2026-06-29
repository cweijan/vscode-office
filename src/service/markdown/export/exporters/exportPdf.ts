import { readFileSync, unlink, writeFileSync } from 'fs';
import os from 'os';
import path from 'path';
import puppeteer from 'puppeteer-core';
import { pathToFileURL } from 'url';
import { createOutline, injectHeadingLinksFromToc } from '../pdf/outline';
import { writeHtmlFile } from './writeHtml';
import { logExportError, logExportInfo } from '../log';
import { pathExists } from '../paths';
import type { ExportConfig } from '../types';

const isDev = process.argv.indexOf('--type=extensionHost') >= 0;

export async function exportPdfFromHtml(markdownFilePath: string, html: string, config: ExportConfig): Promise<string> {
    const originPath = path.parse(markdownFilePath);
    const targetFilePath = path.join(originPath.dir, `${originPath.name}.pdf`);
    const tmpDir = process.platform === 'linux' ? originPath.dir : (isDev ? originPath.dir : os.tmpdir());
    const tmpHtmlPath = path.resolve(tmpDir, `${originPath.name}_tmp.html`);

    const htmlForPdf = config.autoInsertedToc ? injectHeadingLinksFromToc(html) : html;

    writeHtmlFile(tmpHtmlPath, htmlForPdf);
    if (!pathExists(tmpHtmlPath)) {
        throw new Error(`Temporary HTML file not found: ${tmpHtmlPath}`);
    }

    const browser = await puppeteer.launch({
        headless: true,
        executablePath: config.executablePath || undefined,
        args: ['--allow-file-access-from-files', ...(config.puppeteerArgs || [])],
    }).catch(error => {
        logExportError('puppeteer.launch()', error);
        throw error;
    });

    try {
        const page = await browser.newPage().catch(error => {
            logExportError('browser.newPage()', error);
            throw error;
        });

        const fileUrl = pathToFileURL(tmpHtmlPath).href;
        await page.goto(fileUrl, { waitUntil: 'load', timeout: 60000 }).catch(async error => {
            logExportError('page.goto()', error);
            await page.setContent(htmlForPdf, { waitUntil: 'load', timeout: 60000 });
        });

        const margin = config.margin || {};
        const pdf = await page.pdf({
            format: (config.format || 'A4') as 'A4',
            printBackground: config.printBackground ?? true,
            margin: {
                top: margin.top != null ? `${margin.top}px` : undefined,
                right: margin.right != null ? `${margin.right}px` : undefined,
                bottom: margin.bottom != null ? `${margin.bottom}px` : undefined,
                left: margin.left != null ? `${margin.left}px` : undefined,
            },
        }).catch(error => {
            logExportError('page.pdf()', error);
            throw error;
        });

        let pdfBytes: Uint8Array;
        try {
            pdfBytes = !config.withoutOutline
                ? await createOutline(pdf, htmlForPdf)
                : Buffer.from(pdf);
        } catch (error) {
            logExportError('createOutline()', error);
            pdfBytes = Buffer.from(pdf);
        }

        writeFileSync(targetFilePath, pdfBytes);
        logExportInfo(`Exported PDF: ${targetFilePath}`);
        return targetFilePath;
    } finally {
        await browser.close();
        if (!config.debug && pathExists(tmpHtmlPath)) {
            unlink(tmpHtmlPath, () => undefined);
        }
    }
}
