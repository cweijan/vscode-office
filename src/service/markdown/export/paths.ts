import { accessSync, readFileSync } from 'fs';
import path from 'path';
import { parse as parseUrl, pathToFileURL } from 'url';
import type { ExportType } from './types';

export function pathExists(filePath: string): boolean {
    if (!filePath) {
        return false;
    }
    try {
        accessSync(filePath);
        return true;
    } catch (error) {
        console.warn(error instanceof Error ? error.message : String(error));
        return false;
    }
}

export function readTextFile(filename: string, encoding: BufferEncoding = 'utf-8'): string {
    let resolved = filename;
    if (resolved.indexOf('file://') === 0) {
        if (process.platform === 'win32') {
            resolved = resolved.replace(/^file:\/\/\//, '').replace(/^file:\/\//, '');
        } else {
            resolved = resolved.replace(/^file:\/\//, '');
        }
    }
    if (pathExists(resolved)) {
        return readFileSync(resolved, encoding);
    }
    return '';
}

export function resolveStylesDirectory(): string {
    const candidates = [
        path.join(__dirname, 'styles'),
        path.join(__dirname, '..', 'styles'),
    ];
    for (const candidate of candidates) {
        if (pathExists(path.join(candidate, 'arduino-light.css'))) {
            return candidate;
        }
    }
    return path.join(__dirname, 'styles');
}

export function resolveKatexStylesPath(): string {
    return path.resolve(__dirname, '..', 'resource', 'markdown', 'dist', 'js', 'katex', 'katex.min.css');
}

export function resolveExportTemplatePath(): string {
    return path.join(__dirname, 'template', 'template.html');
}

export function resolveMermaidScriptUrl(type: ExportType): string {
    if (type === 'html') {
        return 'https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js';
    }
    return pathToFileURL(
        path.resolve(__dirname, '..', 'resource', 'markdown', 'dist', 'js', 'mermaid', 'mermaid.min.js'),
    ).href;
}

export function resolveCssUrls(css: string, basePath: string, type: ExportType): string {
    return css.replace(/url\((['"]?)([^'")]+)\1\)/g, (match, _quote, assetPath) => {
        const href = assetPath.trim();
        if (/^(data:|https?:|file:|about:|#)/i.test(href)) {
            return match;
        }
        if (type === 'html' && basePath.includes('katex')) {
            return `url("https://cdn.jsdelivr.net/npm/katex@0.16.2/dist/${href.replace(/^\.\//, '')}")`;
        }
        return `url("${pathToFileURL(path.resolve(basePath, href)).href}")`;
    });
}

export function wrapCssFile(filename: string, resolveRelativeUrls = false, type?: ExportType): string {
    try {
        let css = readTextFile(filename);
        if (!css) {
            return '';
        }
        if (resolveRelativeUrls && type) {
            css = resolveCssUrls(css, path.dirname(filename), type);
        }
        return `\n<style>\n${css}\n</style>\n`;
    } catch (error) {
        logExportErrorFromPaths('wrapCssFile()', error);
        return '';
    }
}

function logExportErrorFromPaths(scope: string, error: unknown): void {
    console.error(`ERROR: ${scope}`);
    if (error) {
        console.error(error instanceof Error ? error.toString() : String(error));
    }
}

export function convertImagePath(src: string, markdownFilePath: string): string | undefined {
    try {
        let href = decodeURIComponent(src);
        href = href.replace(/("|")/g, '').replace(/\\/g, '/').replace(/#/g, '%23');
        const protocol = parseUrl(href).protocol;
        if (protocol === 'file:' && href.indexOf('file:///') !== 0) {
            return href.replace(/^file:\/\//, 'file:///');
        }
        if (protocol === 'file:') {
            return href;
        }
        if (!protocol || path.isAbsolute(href)) {
            href = path.resolve(path.dirname(markdownFilePath), href).replace(/\\/g, '/').replace(/#/g, '%23');
            if (href.indexOf('//') === 0) {
                return `file:${href}`;
            }
            if (href.indexOf('/') === 0) {
                return `file://${href}`;
            }
            return `file:///${href}`;
        }
        return src;
    } catch (error) {
        console.error('convertImagePath()', error);
        return undefined;
    }
}
