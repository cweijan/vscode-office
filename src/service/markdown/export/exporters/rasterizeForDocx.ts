import { unlink } from 'fs';
import os from 'os';
import path from 'path';
import type { Browser, ElementHandle, Page } from 'puppeteer-core';
import { pathToFileURL } from 'url';
import { writeHtmlFile } from './writeHtml';
import { logExportError } from '../log';
import { pathExists } from '../paths';
import type { ExportConfig } from '../types';

interface ScreenshotOptions {
    display?: boolean;
    style?: string;
    label?: string;
}

export async function rasterizeDynamicContentForDocx(html: string, config: ExportConfig, exportFilePath = ''): Promise<string> {
    const containsKatex = html.includes('class="katex') || html.includes("class='katex");
    const containsMermaid = html.includes('class="mermaid') || html.includes("class='mermaid");
    if (!containsKatex && !containsMermaid) {
        return html;
    }

    let browser: Browser | undefined;
    let tmpHtmlPath = '';
    try {
        const tmpDir = exportFilePath ? path.dirname(exportFilePath) : os.tmpdir();
        const tmpBaseName = exportFilePath ? path.parse(exportFilePath).name : `markdown_${Date.now()}`;
        tmpHtmlPath = path.resolve(tmpDir, `${tmpBaseName}_math_tmp.html`);
        writeHtmlFile(tmpHtmlPath, html);

        const puppeteer = require('puppeteer-core');
        browser = await puppeteer.launch({
            headless: true,
            executablePath: config.executablePath || undefined,
            args: ['--allow-file-access-from-files', ...(config.puppeteerArgs || [])],
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 1200, height: 800, deviceScaleFactor: 2 });
        await page.goto(pathToFileURL(tmpHtmlPath).href, { waitUntil: 'load', timeout: 60000 });
        await page.evaluate(async () => {
            if (document.fonts?.ready) {
                await document.fonts.ready;
            }
        });

        await waitForMermaid(page);
        await page.addStyleTag({
            content: `
                body { background: transparent !important; }
                .vscode-office-docx-image-shot {
                    display: inline-block !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    text-align: left !important;
                    background: transparent !important;
                }
            `,
        });

        await replaceMermaidWithImages(page);
        await replaceKatexWithImages(page);
        return await page.content();
    } catch (error) {
        logExportError('rasterizeDynamicContentForDocx()', error);
        return html;
    } finally {
        if (browser) {
            await browser.close();
        }
        if (!config.debug && tmpHtmlPath && pathExists(tmpHtmlPath)) {
            unlink(tmpHtmlPath, () => undefined);
        }
    }
}

async function waitForMermaid(page: Page): Promise<void> {
    try {
        const hasMermaid = await page.evaluate(() => document.querySelectorAll('.mermaid').length > 0);
        if (!hasMermaid) {
            return;
        }
        await page.waitForFunction(() => {
            const elements = Array.from(document.querySelectorAll('.mermaid'));
            return elements.length === 0 || elements.every(element => element.querySelector('svg') || element.getAttribute('data-processed') === 'true');
        }, { timeout: 10000 });
    } catch (error) {
        logExportError('waitForMermaid()', error);
    }
}

async function replaceMermaidWithImages(page: Page): Promise<void> {
    try {
        const handles = await page.evaluateHandle(() => {
            const diagrams = Array.from(document.querySelectorAll('.mermaid'))
                .filter(element => element.querySelector('svg'));
            for (const [index, element] of diagrams.entries()) {
                element.setAttribute('data-vscode-office-mermaid-id', String(index));
                element.classList.add('vscode-office-docx-image-shot');
            }
            return diagrams;
        });
        const diagrams = await handles.getProperties();
        for (const handle of diagrams.values()) {
            await replaceElementWithImage(handle as ElementHandle<Element>, {
                display: true,
                style: 'display:block;margin:1em auto',
                label: 'mermaid',
            });
        }
    } catch (error) {
        logExportError('replaceMermaidWithImages()', error);
    }
}

async function replaceKatexWithImages(page: Page): Promise<void> {
    try {
        const handles = await page.evaluateHandle(() => {
            const formulas = Array.from(document.querySelectorAll('.katex-display, .katex'))
                .filter(element => element.classList.contains('katex-display') || !element.closest('.katex-display'));
            for (const [index, element] of formulas.entries()) {
                element.setAttribute('data-vscode-office-math-id', String(index));
                element.setAttribute('data-vscode-office-math-display', String(element.classList.contains('katex-display')));
                element.classList.add('vscode-office-docx-image-shot');
            }
            return formulas;
        });
        const formulas = await handles.getProperties();
        for (const handle of formulas.values()) {
            await replaceKatexFormulaWithImage(handle as ElementHandle<Element>);
        }
    } catch (error) {
        logExportError('replaceKatexWithImages()', error);
    }
}

async function replaceKatexFormulaWithImage(handle: ElementHandle<Element>): Promise<void> {
    try {
        const formula = handle.asElement();
        if (!formula) {
            return;
        }
        const box = await formula.boundingBox();
        if (!box || box.width <= 0 || box.height <= 0) {
            return;
        }
        const image = await formula.screenshot({ type: 'png', omitBackground: true });
        const src = `data:image/png;base64,${Buffer.from(image).toString('base64')}`;
        await formula.evaluate((element, imageSrc, width, height) => {
            const isDisplay = element.getAttribute('data-vscode-office-math-display') === 'true';
            const imageElement = document.createElement('img');
            imageElement.setAttribute('src', imageSrc);
            imageElement.setAttribute('width', String(Math.ceil(width)));
            imageElement.setAttribute('height', String(Math.ceil(height)));
            imageElement.setAttribute('style', [
                `width:${Math.ceil(width)}px`,
                `height:${Math.ceil(height)}px`,
                isDisplay ? 'display:block' : 'display:inline-block',
                isDisplay ? 'margin:1em auto' : 'vertical-align:middle',
            ].join(';'));
            imageElement.setAttribute('alt', element.textContent || 'math');
            element.replaceWith(imageElement);
        }, src, box.width, box.height);
    } catch (error) {
        logExportError('replaceKatexFormulaWithImage()', error);
    }
}

async function replaceElementWithImage(handle: ElementHandle<Element>, options: ScreenshotOptions = {}): Promise<void> {
    try {
        const element = handle.asElement();
        if (!element) {
            return;
        }
        const box = await element.boundingBox();
        if (!box || box.width <= 0 || box.height <= 0) {
            return;
        }
        const image = await element.screenshot({ type: 'png', omitBackground: true });
        const src = `data:image/png;base64,${Buffer.from(image).toString('base64')}`;
        await element.evaluate((target, imageSrc, width, height, imageOptions) => {
            const imageElement = document.createElement('img');
            imageElement.setAttribute('src', imageSrc);
            imageElement.setAttribute('width', String(Math.ceil(width)));
            imageElement.setAttribute('height', String(Math.ceil(height)));
            imageElement.setAttribute('style', [
                `width:${Math.ceil(width)}px`,
                `height:${Math.ceil(height)}px`,
                imageOptions.style || (imageOptions.display ? 'display:block;margin:1em auto' : 'display:inline-block;vertical-align:middle'),
            ].join(';'));
            imageElement.setAttribute('alt', imageOptions.label || target.textContent || 'image');
            target.replaceWith(imageElement);
        }, src, box.width, box.height, options);
    } catch (error) {
        logExportError('replaceElementWithImage()', error);
    }
}