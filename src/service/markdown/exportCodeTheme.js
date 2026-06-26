const fs = require('fs');
const path = require('path');

const CM_THEME_FILES = {
    Auto: 'Auto.css',
    Github: 'github.css',
    'Solarized Light': 'solarized-light.css',
    'Material Light': 'material-light.css',
    'Quiet Light': 'quiet-light.css',
    'One Light': 'one-light.css',
    Dracula: 'dracula.css',
    Monokai: 'monokai.css',
    'One Dark': 'one-dark.css',
    'Solarized Dark': 'solarized-dark.css',
    'Material Dark': 'material-dark.css',
};

const SYNTAX_VAR_KEYS = [
    'comment',
    'keyword',
    'string',
    'number',
    'atom',
    'property',
    'attribute',
    'variable',
    'def',
    'bracket',
    'tag',
    'link',
    'error',
];

const getCodeThemeDir = () => {
    const candidates = [
        path.resolve(__dirname, '..', 'resource', 'markdown', 'dist', 'css', 'code-theme'),
        path.resolve(__dirname, '..', '..', '..', 'resource', 'markdown', 'dist', 'css', 'code-theme'),
    ];
    for (const dir of candidates) {
        if (fs.existsSync(dir)) {
            return dir;
        }
    }
    return candidates[0];
};

const parseCmThemeCss = (cssText) => {
    const vars = {};
    const re = /--([\w-]+)\s*:\s*([^;]+);/g;
    let match = re.exec(cssText);
    while (match) {
        vars[`--${match[1]}`] = match[2].trim();
        match = re.exec(cssText);
    }
    return vars;
};

const readThemeCssVars = (themeId) => {
    const fileName = CM_THEME_FILES[themeId] || `${String(themeId || 'Auto').toLowerCase().replace(/\s+/g, '-')}.css`;
    const filePath = path.join(getCodeThemeDir(), fileName);
    if (!fs.existsSync(filePath)) {
        return {};
    }
    return parseCmThemeCss(fs.readFileSync(filePath, 'utf-8'));
};

const pickColor = (...values) => {
    for (const value of values) {
        if (value && typeof value === 'string' && value.trim()) {
            return value.trim();
        }
    }
    return '';
};

const resolveCodeThemeColors = (exportTheme) => {
    const sampled = exportTheme?.codeThemeColors || {};
    const cssVariables = exportTheme?.cssVariables || {};
    const themeId = exportTheme?.codeMirrorTheme || 'Auto';
    const fileVars = readThemeCssVars(themeId);

    const fromVar = (key) => pickColor(
        sampled[key],
        cssVariables[`--cm-syntax-${key}`],
        fileVars[`--cm-syntax-${key}`],
    );

    const bg = pickColor(sampled.bg, cssVariables['--cm-bg-color'], fileVars['--cm-bg-color'], cssVariables['--code-bg-color'], '#f6f8fa');
    const fg = pickColor(sampled.fg, cssVariables['--cm-fg-color'], fileVars['--cm-fg-color'], cssVariables['--code-fg-color'], fromVar('variable'), '#24292f');

    const colors = { bg, fg };
    for (const key of SYNTAX_VAR_KEYS) {
        colors[key] = fromVar(key) || fg;
    }
    return colors;
};

/**
 * @param {import('../markdownService').ExportThemeSettings | null | undefined} exportTheme
 * @returns {string}
 */
function buildHljsThemeCss(exportTheme) {
    const theme = exportTheme || { codeMirrorTheme: 'Github', cssVariables: {} };
    const c = resolveCodeThemeColors(theme);
    const css = `
.hljs {
  display: block;
  overflow-x: auto;
  padding: 0.5em;
  background: ${c.bg};
  color: ${c.fg};
}

.hljs,
.hljs-subst {
  color: ${c.variable || c.fg};
}

.hljs-comment {
  color: ${c.comment};
  font-style: italic;
}

.hljs-keyword,
.hljs-selector-tag,
.hljs-doctag,
.hljs-name,
.hljs-meta-keyword {
  color: ${c.keyword};
}

.hljs-built_in,
.hljs-literal,
.hljs-bullet,
.hljs-code,
.hljs-addition,
.hljs-number {
  color: ${c.number || c.atom};
}

.hljs-regexp,
.hljs-symbol,
.hljs-template-variable,
.hljs-link,
.hljs-selector-attr,
.hljs-selector-pseudo {
  color: ${c.string};
}

.hljs-string,
.hljs-quote,
.hljs-template-tag,
.hljs-deletion {
  color: ${c.string};
}

.hljs-type,
.hljs-selector-id,
.hljs-selector-class {
  color: ${c.property};
}

.hljs-attribute {
  color: ${c.attribute};
}

.hljs-variable {
  color: ${c.variable};
}

.hljs-title,
.hljs-section {
  color: ${c.def};
  font-weight: bold;
}

.hljs-function {
  color: ${c.def};
}

.hljs-meta {
  color: ${c.variable || c.fg};
}

.hljs-emphasis {
  font-style: italic;
}

.hljs-strong {
  font-weight: bold;
}
`;

    return `\n<style id="vditor-export-hljs-theme">\n${css.trim()}\n</style>\n`;
}

module.exports = {
    buildHljsThemeCss,
    resolveCodeThemeColors,
};
