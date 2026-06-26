/**
 * Convert vditor export theme settings to CSS for exported HTML/PDF/DOCX.
 * @param {import('./exportThemeCss').ExportThemeSettings | null | undefined} exportTheme
 * @returns {string}
 */
const { resolveMermaidExportBackground } = require('./exportMermaidTheme');

function resolveLayout(exportTheme) {
    const layout = exportTheme.layout || {};
    const globalSettings = exportTheme.globalSettings || {};
    const vars = exportTheme.cssVariables || {};

    const fontSize = layout.fontSize
        || (globalSettings.editorFontSize != null ? `${globalSettings.editorFontSize}px` : '')
        || vars['--editor-font-size']
        || '16px';

    const fontFamily = layout.fontFamily
        || (globalSettings.editorFontFamily && globalSettings.editorFontFamily !== 'inherit'
            ? String(globalSettings.editorFontFamily) : '')
        || (vars['--editor-font-family'] && vars['--editor-font-family'] !== 'inherit'
            ? vars['--editor-font-family'] : '')
        || 'system-ui, sans-serif';

    const lineHeight = layout.lineHeight
        || (globalSettings.editorLineHeight != null ? String(globalSettings.editorLineHeight) : '')
        || vars['--editor-line-height']
        || '1.7';

    const pageWidth = layout.pageWidth
        || globalSettings.pageWidth
        || vars['--vditor-page-width']
        || '100%';

    const codeFontFamily = layout.codeFontFamily
        || (globalSettings.codeFontFamily && globalSettings.codeFontFamily !== 'inherit'
            ? String(globalSettings.codeFontFamily) : '')
        || (vars['--code-font-family'] && vars['--code-font-family'] !== 'inherit'
            ? vars['--code-font-family'] : '')
        || 'mononoki, Consolas, "Liberation Mono", Menlo, Courier, monospace';

    return { fontSize, fontFamily, lineHeight, pageWidth, codeFontFamily };
}

function buildExportThemeCss(exportTheme) {
    if (!exportTheme || typeof exportTheme !== 'object') {
        return '';
    }

    const vars = { ...(exportTheme.cssVariables || {}) };
    const { fontSize, fontFamily, lineHeight, pageWidth, codeFontFamily } = resolveLayout(exportTheme);

    vars['--editor-font-size'] = fontSize;
    vars['--editor-line-height'] = lineHeight;
    vars['--editor-font-family'] = fontFamily;
    vars['--code-font-family'] = codeFontFamily;
    vars['--vditor-page-width'] = pageWidth;

    const globalSettings = exportTheme.globalSettings || {};
    if (!vars['--bold-color'] && globalSettings.boldColor && globalSettings.boldColor !== 'inherit') {
        vars['--bold-color'] = String(globalSettings.boldColor);
    }
    if (!vars['--vditor-image-max-width'] && globalSettings.imageMaxWidth != null) {
        vars['--vditor-image-max-width'] = `${globalSettings.imageMaxWidth}%`;
    }
    if (!vars['--vditor-image-max-height'] && globalSettings.imageMaxHeight != null) {
        vars['--vditor-image-max-height'] = `${globalSettings.imageMaxHeight}vh`;
    }

    const varBlock = Object.entries(vars)
        .map(([name, value]) => `  ${name}: ${value};`)
        .join('\n');

    const imageMaxWidth = vars['--vditor-image-max-width'] || '100%';
    const imageMaxHeight = vars['--vditor-image-max-height'] || 'none';
    const mermaidBg = resolveMermaidExportBackground(exportTheme);
    const darkClass = exportTheme.isDark ? '.vditor-export--dark' : '';

    const css = `
:root {
${varBlock}
}

body.vditor-export${darkClass} {
  font-family: ${fontFamily} !important;
  font-size: ${fontSize} !important;
  line-height: ${lineHeight} !important;
  color: var(--front-color, #333333);
  background: var(--bg-color, #ffffff);
}

body.vditor-export .content-wrapper {
  box-sizing: border-box;
  width: 100%;
  max-width: ${pageWidth} !important;
  margin: 0 auto;
  padding: 0 30px;
}

body.vditor-export p,
body.vditor-export li,
body.vditor-export td,
body.vditor-export th,
body.vditor-export blockquote {
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
}

body.vditor-export a {
  color: var(--link-color, #4080d0);
  text-decoration: none;
}

body.vditor-export a:hover {
  color: var(--list-hover-color, var(--link-color, #4080d0));
  text-decoration: underline;
}

body.vditor-export hr {
  border: 0;
  height: 2px;
  border-bottom: 2px solid var(--hr-bg, var(--border-color, #eeeeee));
}

body.vditor-export h1,
body.vditor-export h2,
body.vditor-export h3,
body.vditor-export h4,
body.vditor-export h5,
body.vditor-export h6 {
  border-bottom: none;
  padding-bottom: 0;
  font-weight: 600;
}

body.vditor-export h1 { font-size: 1.75em; }
body.vditor-export h2 { font-size: 1.55em; }
body.vditor-export h3 { font-size: 1.38em; }
body.vditor-export h4 { font-size: 1.25em; }
body.vditor-export h5 { font-size: 1.13em; }

body.vditor-export strong,
body.vditor-export b {
  color: var(--bold-color, inherit);
  font-weight: 700;
}

body.vditor-export blockquote {
  color: var(--blockquote-color, var(--front-color, #333333));
  background: var(--blockquote-bg, rgba(127, 127, 127, 0.1));
  border-left-color: var(--blockquote-border, var(--border-color, rgba(0, 122, 204, 0.5)));
}

body.vditor-export table {
  border-color: var(--table-border, var(--border-color, #dddddd));
}

body.vditor-export table > thead > tr > th {
  background: var(--table-header-bg, #eef1f4);
  border-bottom-color: var(--table-row-border, var(--table-border, #dddddd));
}

body.vditor-export table > tbody > tr > td,
body.vditor-export table > tbody > tr > th {
  background: var(--table-body-bg, transparent);
}

body.vditor-export table > tbody > tr + tr > td {
  border-top-color: var(--table-row-border, var(--table-border, #dddddd));
}

body.vditor-export :not(pre):not(.hljs) > code {
  font-family: ${codeFontFamily};
  color: var(--code-fg-color, inherit);
  background: var(--code-bg-color, rgba(127, 127, 127, 0.15));
  border-radius: 4px;
  padding: 0.15em 0.35em;
}

body.vditor-export pre.hljs {
  font-family: ${codeFontFamily};
  border: 1px solid var(--border-color, #cccccc);
  border-radius: 3px;
}

body.vditor-export pre.hljs code > div {
  font-family: inherit;
}

body.vditor-export pre:not(.hljs),
body.vditor-export pre:not(.hljs) code > div {
  font-family: ${codeFontFamily};
  color: var(--code-fg-color, inherit);
  background: var(--code-bg-color, rgba(127, 127, 127, 0.15));
  border: 1px solid var(--border-color, #cccccc);
  border-radius: 3px;
}

body.vditor-export img {
  max-width: ${imageMaxWidth};
  max-height: ${imageMaxHeight};
}

body.vditor-export .mermaid {
  display: block;
  max-width: 100%;
  margin: 1em 0;
  padding: 12px;
  overflow-x: auto;
  background: ${mermaidBg};
  border-radius: 4px;
}

body.vditor-export .mermaid svg {
  max-width: none;
}

body.vditor-export .language-mermaid {
  background: ${mermaidBg};
}

body.vditor-export .callout {
  --callout-accent: var(--chart-blue, #0969da);
  margin: 12px 0;
  border-radius: 6px;
  border-left: 4px solid var(--callout-accent);
  background: color-mix(in srgb, var(--callout-accent) 10%, var(--panel-background-color, var(--bg-color, #fff)));
  color: var(--front-color, #333333);
  overflow: hidden;
}

body.vditor-export .callout[data-callout="note" i],
body.vditor-export .callout[data-callout="abstract" i],
body.vditor-export .callout[data-callout="info" i],
body.vditor-export .callout[data-callout="todo" i],
body.vditor-export .callout[data-subtype="note" i],
body.vditor-export .callout[data-subtype="abstract" i],
body.vditor-export .callout[data-subtype="info" i],
body.vditor-export .callout[data-subtype="todo" i] {
  --callout-accent: var(--chart-blue, #0969da);
}

body.vditor-export .callout[data-callout="tip" i],
body.vditor-export .callout[data-callout="hint" i],
body.vditor-export .callout[data-subtype="tip" i],
body.vditor-export .callout[data-subtype="hint" i] {
  --callout-accent: var(--chart-green, #116329);
}

body.vditor-export .callout[data-callout="important" i],
body.vditor-export .callout[data-subtype="important" i] {
  --callout-accent: var(--chart-purple, #8250df);
}

body.vditor-export .callout[data-callout="warning" i],
body.vditor-export .callout[data-subtype="warning" i] {
  --callout-accent: var(--chart-orange, #bc4c00);
}

body.vditor-export .callout[data-callout="caution" i],
body.vditor-export .callout[data-callout="danger" i],
body.vditor-export .callout[data-callout="error" i],
body.vditor-export .callout[data-callout="bug" i],
body.vditor-export .callout[data-callout="fail" i],
body.vditor-export .callout[data-subtype="caution" i],
body.vditor-export .callout[data-subtype="danger" i],
body.vditor-export .callout[data-subtype="error" i],
body.vditor-export .callout[data-subtype="bug" i],
body.vditor-export .callout[data-subtype="fail" i] {
  --callout-accent: var(--chart-red, #cf222e);
}

body.vditor-export .callout[data-callout="question" i],
body.vditor-export .callout[data-callout="help" i],
body.vditor-export .callout[data-callout="faq" i],
body.vditor-export .callout[data-subtype="question" i],
body.vditor-export .callout[data-subtype="help" i],
body.vditor-export .callout[data-subtype="faq" i] {
  --callout-accent: var(--chart-yellow, #9a6700);
}

body.vditor-export .callout .callout-title,
body.vditor-export .callout .callout-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px 0;
  margin-bottom: 10px;
  color: var(--callout-accent);
}

body.vditor-export .callout .callout-title-icon,
body.vditor-export .callout .callout-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: var(--callout-accent);
}

body.vditor-export .callout .callout-title-icon svg {
  width: 16px;
  height: 16px;
}

body.vditor-export .callout .callout-title-inner,
body.vditor-export .callout > .callout-info > .callout-title {
  font-weight: 700;
  font-size: 0.95em;
  line-height: 1.35;
  color: var(--callout-accent);
}

body.vditor-export .callout .callout-content {
  padding: 6px 14px 12px;
  color: var(--front-color, #333333);
}

body.vditor-export .callout .callout-content > :first-child {
  margin-top: 0;
}

body.vditor-export .callout .callout-content > :last-child {
  margin-bottom: 0;
}

body.vditor-export.vditor-export--dark .callout {
  background: color-mix(in srgb, var(--callout-accent) 16%, var(--panel-background-color, var(--bg-color, #24292e)));
}

body.vditor-export .obsidian-wikilink {
  color: var(--wikilink-color, var(--link-color, #7c3aed));
  text-decoration: underline;
}

body.vditor-export .obsidian-wikilink-embed {
  display: inline-block;
  padding: 2px 8px;
  border: 1px dashed var(--border-color, #d0d7de);
  border-radius: 4px;
  color: var(--wikilink-color, var(--link-color, #7c3aed));
}

body.vditor-export .obsidian-tag {
  color: var(--link-color, #7c3aed);
  background: color-mix(in srgb, var(--link-color, #7c3aed) 12%, transparent);
  border-radius: 4px;
  padding: 0 4px;
}

body.vditor-export mark {
  background: color-mix(in srgb, var(--chart-yellow, #9a6700) 35%, transparent);
  color: inherit;
  padding: 0 2px;
  border-radius: 2px;
}

body.vditor-export [data-type="yaml-front-matter"] {
  margin: 0 0 16px;
}

body.vditor-export .vditor-properties {
  border: 1px solid color-mix(in srgb, var(--border-color, #d0d7de) 85%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--panel-background-color, var(--bg-color, #fff)) 94%, var(--second-bg-color, #f6f8fa));
  overflow: hidden;
}

body.vditor-export .vditor-properties__heading {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid color-mix(in srgb, var(--border-color, #d0d7de) 70%, transparent);
  background: color-mix(in srgb, var(--second-bg-color, #f3f4f6) 60%, transparent);
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--second-color, var(--vscode-descriptionForeground, #6b7280));
}

body.vditor-export .vditor-properties__heading-icon::before {
  content: "☰";
  opacity: 0.75;
}

body.vditor-export .vditor-properties__table {
  display: flex;
  flex-direction: column;
}

body.vditor-export .vditor-properties__row {
  display: grid;
  grid-template-columns: minmax(120px, 34%) 1fr;
  gap: 8px 12px;
  align-items: start;
  padding: 8px 12px;
  border-top: 1px solid color-mix(in srgb, var(--border-color, #d0d7de) 45%, transparent);
}

body.vditor-export .vditor-properties__row:first-child {
  border-top: none;
}

body.vditor-export .vditor-properties__key {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  color: var(--second-color, var(--vscode-descriptionForeground, #6b7280));
  font-size: 0.85rem;
}

body.vditor-export .vditor-properties__key-icon {
  flex-shrink: 0;
  width: 14px;
  height: 14px;
  opacity: 0.72;
  text-align: center;
}

body.vditor-export .vditor-properties__key-icon[data-icon="tag"]::before { content: "#"; }
body.vditor-export .vditor-properties__key-icon[data-icon="alias"]::before { content: "⛓"; }
body.vditor-export .vditor-properties__key-icon[data-icon="date"]::before { content: "📅"; }
body.vditor-export .vditor-properties__key-icon[data-icon="toggle"]::before { content: "◉"; }
body.vditor-export .vditor-properties__key-icon[data-icon="number"]::before { content: "#"; }
body.vditor-export .vditor-properties__key-icon[data-icon="list"]::before { content: "≡"; }
body.vditor-export .vditor-properties__key-icon[data-icon="text"]::before { content: "T"; }

body.vditor-export .vditor-properties__key-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

body.vditor-export .vditor-properties__value {
  min-width: 0;
  font-size: 0.92rem;
  color: var(--front-color, inherit);
  word-break: break-word;
}

body.vditor-export .vditor-properties__value--tags,
body.vditor-export .vditor-properties__value--aliases {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

body.vditor-export .vditor-properties__value--aliases {
  gap: 6px;
}

body.vditor-export .vditor-properties__list {
  margin: 0;
  padding-left: 1.1rem;
}

body.vditor-export .vditor-properties__checkbox {
  display: inline-block;
  width: 14px;
  height: 14px;
  margin-right: 6px;
  border: 1px solid var(--border-color, #d0d7de);
  border-radius: 3px;
  vertical-align: -2px;
  background: var(--panel-background-color, var(--bg-color, #fff));
}

body.vditor-export .vditor-properties__checkbox[is-checked="true"] {
  background: var(--link-color, #7c3aed);
  border-color: var(--link-color, #7c3aed);
  box-shadow: inset 0 0 0 2px var(--panel-background-color, var(--bg-color, #fff));
}

body.vditor-export .vditor-properties__empty {
  opacity: 0.45;
}
`;

    return `\n<style id="vditor-export-theme">\n${css.trim()}\n</style>\n`;
}

module.exports = {
    buildExportThemeCss,
    resolveLayout,
};
