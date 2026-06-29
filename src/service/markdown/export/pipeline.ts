import { readFileSync } from 'fs';
import path from 'path';
import { load as loadCheerio } from 'cheerio';
import { Uri } from 'vscode';
import { exportDocument } from './exporters';
import { buildHtmlDocumentFromUri } from './htmlDocument';
import { renderMarkdownToHtml } from './markdownRenderer';
import { resolveMermaidScriptUrl } from './paths';
import { usesProTheme } from './styleLoader';
import { buildMermaidExportConfig } from './theme/mermaidTheme';
import { logExportInfo } from './log';
import type { ExportConfig } from './types';

function appendMermaidBootstrap(html: string, config: ExportConfig): string {
    const $ = loadCheerio(html);
    if ($('.mermaid').length === 0) {
        return html;
    }

    const mermaidScript = usesProTheme(config)
        ? `
    <script src="${resolveMermaidScriptUrl(config.type)}"></script>
    <script>mermaid.initialize(${JSON.stringify(buildMermaidExportConfig(config.exportTheme))});</script>
    `
        : `
    <script src="${resolveMermaidScriptUrl(config.type)}"></script>
    <script>mermaid.initialize({startOnLoad:true});</script>
    `;

    $('body').append(mermaidScript);
    return $.html();
}

export async function runExportPipeline(markdownFilePath: string, config: ExportConfig): Promise<string> {
    const resolvedPath = path.resolve(markdownFilePath);
    const uri = Uri.file(resolvedPath);
    const markdown = readFileSync(resolvedPath).toString();
    const content = renderMarkdownToHtml(resolvedPath, config.type, markdown, config);
    const html = appendMermaidBootstrap(
        buildHtmlDocumentFromUri(content, uri, config.type, config),
        config,
    );
    return exportDocument(resolvedPath, html, config);
}

export async function exportMarkdownFile(markdownFilePath: string, config: ExportConfig): Promise<void> {
    logExportInfo(`Converting markdown file: ${markdownFilePath}`);
    await runExportPipeline(markdownFilePath, config);
}
