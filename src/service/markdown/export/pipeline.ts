import { readFileSync } from 'fs';
import path from 'path';
import { parse } from 'node-html-parser';
import { Uri } from 'vscode';
import { exportDocument } from './exporters';
import { buildHtmlDocumentFromUri } from './htmlDocument';
import { renderMarkdownToHtml } from './markdownRenderer';
import { resolveMermaidScriptUrl } from './paths';
import { usesProExport, resolveExportStyleMode } from './styleLoader';
import { buildMermaidExportConfig } from './theme/mermaidTheme';
import { logExportInfo } from './log';
import type { ExportConfig } from './types';

function resolveMermaidTheme(config: ExportConfig) {
    if (!config.exportTheme) {
        return config.exportTheme;
    }
    if (resolveExportStyleMode(config) === 'pro-theme') {
        return config.exportTheme;
    }
    return { ...config.exportTheme, isDark: false };
}

function appendMermaidBootstrap(html: string, config: ExportConfig): string {
    if (!parse(html).querySelector('.mermaid')) {
        return html;
    }

    const mermaidTheme = resolveMermaidTheme(config);
    const mermaidScript = usesProExport(config)
        ? `
    <script src="${resolveMermaidScriptUrl(config.type)}"></script>
    <script>mermaid.initialize(${JSON.stringify(buildMermaidExportConfig(mermaidTheme))});</script>
    `
        : `
    <script src="${resolveMermaidScriptUrl(config.type)}"></script>
    <script>mermaid.initialize({startOnLoad:true});</script>
    `;

    if (html.includes('</body>')) {
        return html.replace('</body>', `${mermaidScript}</body>`);
    }
    return `${html}${mermaidScript}`;
}

export async function runExportPipeline(markdownFilePath: string, config: ExportConfig): Promise<string> {
    const resolvedPath = path.resolve(markdownFilePath);
    const uri = Uri.file(resolvedPath);
    const markdown = readFileSync(resolvedPath).toString();
    const { html: content, autoInsertedToc } = renderMarkdownToHtml(resolvedPath, config.type, markdown, config);
    const html = appendMermaidBootstrap(
        buildHtmlDocumentFromUri(content, uri, config.type, config, { autoInsertedToc }),
        config,
    );
    return exportDocument(resolvedPath, html, { ...config, autoInsertedToc });
}

export async function exportMarkdownFile(markdownFilePath: string, config: ExportConfig): Promise<void> {
    logExportInfo(`Converting markdown file: ${markdownFilePath}`);
    await runExportPipeline(markdownFilePath, config);
}
