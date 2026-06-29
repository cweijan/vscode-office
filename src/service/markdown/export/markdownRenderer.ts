import { load as loadCheerio } from 'cheerio';
import MarkdownIt from 'markdown-it';
import markdownItCheckbox from 'markdown-it-checkbox';
import markdownItPlantuml from 'markdown-it-plantuml';
import markdownItToc from 'markdown-it-toc-done-right';
import markdownItAnchor from 'markdown-it-anchor';
import markdownItObsidianCallouts from 'markdown-it-obsidian-callouts';
import markdownItMark from 'markdown-it-mark';
import hljs from 'highlight.js';
import markdownItKatex from '../ext/markdown-it-katex';
import markdownItMermaid from '../ext/markdown-it-mermaid';
import markdownItObsidian from '../ext/markdown-it-obsidian';
import markdownItFrontMatterExport from '../ext/markdown-it-front-matter';
import { convertImagePath } from './paths';
import { logExportError, logExportInfo } from './log';
import type { ExportConfig, ExportType } from './types';

export interface RenderMarkdownResult {
    html: string;
    autoInsertedToc: boolean;
}

export function injectPdfTableOfContents(markdown: string, config: ExportConfig): { markdown: string; autoInsertedToc: boolean } {
    const needOutline = !markdown.match(/\[toc\]/i) && !config.withoutOutline;
    if (!needOutline) {
        return { markdown, autoInsertedToc: false };
    }
    const toc = '[toc]\n';
    const frontMatterMatch = markdown.match(/^---[\s\S]*?\n---\s*\n?/);
    if (frontMatterMatch) {
        return {
            markdown: frontMatterMatch[0] + toc + markdown.slice(frontMatterMatch[0].length),
            autoInsertedToc: true,
        };
    }
    return { markdown: toc + markdown, autoInsertedToc: true };
}

export function renderMarkdownToHtml(markdownFilePath: string, type: ExportType, markdown: string, config: ExportConfig): RenderMarkdownResult {
    let autoInsertedToc = false;
    let source = markdown;
    if (type === 'pdf') {
        const injected = injectPdfTableOfContents(source, config);
        source = injected.markdown;
        autoInsertedToc = injected.autoInsertedToc;
    }

    try {
        logExportInfo('Rendering markdown to HTML ...');
        const md = new MarkdownIt({
            html: true,
            breaks: config.breaks,
            highlight(str, lang) {
                if (lang && hljs.getLanguage(lang)) {
                    try {
                        return `<pre class='hljs'><code><div>${hljs.highlight(lang, str, true).value}</div></code></pre>`;
                    } catch (error) {
                        logExportError('markdown-it:highlight', error);
                    }
                }
                return `<pre class='hljs'><code><div>${MarkdownIt().utils.escapeHtml(str)}</div></code></pre>`;
            },
        });

        const defaultImageRender = md.renderer.rules.image;
        md.renderer.rules.image = (tokens, idx, options, env, self) => {
            const token = tokens[idx];
            const srcIndex = token.attrIndex('src');
            let href = token.attrs[srcIndex][1];
            if (type === 'html') {
                href = decodeURIComponent(href).replace(/("|")/g, '');
            } else {
                href = convertImagePath(href, markdownFilePath) ?? href;
            }
            token.attrs[srcIndex][1] = href;
            return defaultImageRender!(tokens, idx, options, env, self);
        };

        if (type !== 'html') {
            md.renderer.rules.html_block = (tokens, idx) => {
                const html = tokens[idx].content;
                const $ = loadCheerio(html);
                $('img').each((_i, element) => {
                    const src = $(element).attr('src');
                    if (!src) {
                        return;
                    }
                    const href = convertImagePath(src, markdownFilePath);
                    if (href) {
                        $(element).attr('src', href);
                    }
                });
                return $.html();
            };
        }

        md.use(markdownItFrontMatterExport)
            .use(markdownItObsidian)
            .use(markdownItObsidianCallouts)
            .use(markdownItMark)
            .use(markdownItCheckbox)
            .use(markdownItAnchor)
            .use(markdownItToc)
            .use(markdownItKatex)
            .use(markdownItPlantuml)
            .use(markdownItMermaid);

        return { html: md.render(source), autoInsertedToc };
    } catch (error) {
        logExportError('renderMarkdownToHtml()', error);
        return { html: '', autoInsertedToc: false };
    }
}
