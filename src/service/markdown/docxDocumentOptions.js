const { resolveLayout } = require('./exportThemeCss');

const GENERIC_FAMILIES = new Set([
    'inherit',
    'initial',
    'unset',
    'serif',
    'sans-serif',
    'monospace',
    'cursive',
    'fantasy',
    'system-ui',
    'ui-serif',
    'ui-sans-serif',
    'ui-monospace',
    'ui-rounded',
    'emoji',
    'math',
    'fangsong',
]);

/** CSS font name (lowercase) -> Word font name */
const WORD_FONT_MAP = new Map([
    ['optima', 'Candara'],
    ['candara', 'Candara'],
    ['gill sans', 'Gill Sans MT'],
    ['georgia', 'Georgia'],
    ['times new roman', 'Times New Roman'],
    ['times', 'Times New Roman'],
    ['palatino', 'Palatino Linotype'],
    ['palatino linotype', 'Palatino Linotype'],
    ['book antiqua', 'Book Antiqua'],
    ['garamond', 'Garamond'],
    ['eb garamond', 'Garamond'],
    ['cormorant garamond', 'Garamond'],
    ['charter', 'Charter'],
    ['bitstream charter', 'Charter'],
    ['sitka text', 'Sitka Text'],
    ['rockwell', 'Rockwell'],
    ['arial narrow', 'Arial Narrow'],
    ['liberation sans narrow', 'Arial Narrow'],
    ['menlo', 'Consolas'],
    ['monaco', 'Consolas'],
    ['consolas', 'Consolas'],
    ['liberation mono', 'Consolas'],
    ['jetbrains mono', 'Consolas'],
    ['cascadia code', 'Cascadia Mono'],
    ['cascadia mono', 'Cascadia Mono'],
    ['fira code', 'Consolas'],
    ['courier new', 'Courier New'],
    ['courier', 'Courier New'],
    ['segoe ui', 'Calibri'],
    ['segoe wpc', 'Calibri'],
    ['calibri', 'Calibri'],
    ['arial', 'Arial'],
    ['helvetica', 'Arial'],
    ['helveticaneue-light', 'Calibri'],
    ['blinkmacsystemfont', 'Calibri'],
    ['-apple-system', 'Calibri'],
    ['sf pro text', 'Calibri'],
    ['microsoft yahei', 'Microsoft YaHei'],
    ['微软雅黑', 'Microsoft YaHei'],
    ['simhei', 'SimHei'],
    ['黑体', 'SimHei'],
    ['simsun', 'SimSun'],
    ['宋体', 'SimSun'],
    ['songti sc', 'SimSun'],
    ['pingfang sc', 'PingFang SC'],
    ['hiragino sans gb', 'PingFang SC'],
    ['noto sans cjk sc', 'Microsoft YaHei'],
    ['noto serif cjk sc', 'SimSun'],
    ['droid sans fallback', 'Microsoft YaHei'],
]);

const parseFontFamilies = (fontFamily) => {
    const parts = [];
    let current = '';
    let inQuote = false;
    for (const ch of fontFamily) {
        if (ch === '"' || ch === "'") {
            inQuote = !inQuote;
            continue;
        }
        if (ch === ',' && !inQuote) {
            if (current.trim()) {
                parts.push(current.trim());
            }
            current = '';
            continue;
        }
        current += ch;
    }
    if (current.trim()) {
        parts.push(current.trim());
    }
    return parts;
};

const lookupWordFont = (family) => {
    const normalized = family.toLowerCase().trim();
    if (WORD_FONT_MAP.has(normalized)) {
        return WORD_FONT_MAP.get(normalized);
    }
    for (const [key, wordFont] of WORD_FONT_MAP) {
        if (normalized.includes(key) || key.includes(normalized)) {
            return wordFont;
        }
    }
    if (/[\u4e00-\u9fff]/.test(family)) {
        return family;
    }
    if (/mono|code|console|typewriter/i.test(family)) {
        return 'Consolas';
    }
    if (/serif/i.test(family) && !/sans/i.test(family)) {
        return 'Times New Roman';
    }
    return family;
};

/**
 * Map CSS font-family stack to a single Word-compatible font name.
 * @param {string} fontFamily
 * @returns {string}
 */
function resolveWordFont(fontFamily) {
    if (!fontFamily || fontFamily === 'inherit') {
        return 'Calibri';
    }
    for (const family of parseFontFamilies(fontFamily)) {
        const normalized = family.toLowerCase().trim();
        if (GENERIC_FAMILIES.has(normalized)) {
            if (normalized === 'serif') {
                return 'Times New Roman';
            }
            if (normalized === 'monospace') {
                return 'Consolas';
            }
            if (normalized === 'sans-serif' || normalized === 'system-ui') {
                continue;
            }
            continue;
        }
        return lookupWordFont(family);
    }
    return 'Calibri';
}

/**
 * Convert CSS font size to html-to-docx fontSize (half-points, HIP).
 * @param {string} fontSize
 * @returns {number}
 */
function resolveDocxFontSize(fontSize) {
    const raw = String(fontSize || '').trim();
    const match = raw.match(/^([\d.]+)\s*(px|pt)?$/i);
    if (!match) {
        return 22;
    }
    const value = parseFloat(match[1]);
    const unit = (match[2] || 'px').toLowerCase();
    const pt = unit === 'pt' ? value : value * 0.75;
    return Math.max(12, Math.min(72, Math.round(pt * 2)));
}

/**
 * @param {import('../markdownService').ExportThemeSettings | null | undefined} exportTheme
 * @returns {{ font: string, fontSize: number, complexScriptFontSize: number }}
 */
function buildDocxDocumentOptions(exportTheme) {
    const { fontSize, fontFamily } = resolveLayout(exportTheme || {});
    const font = resolveWordFont(fontFamily);
    const docxFontSize = resolveDocxFontSize(fontSize);
    return {
        font,
        fontSize: docxFontSize,
        complexScriptFontSize: docxFontSize,
    };
}

module.exports = {
    resolveWordFont,
    resolveDocxFontSize,
    buildDocxDocumentOptions,
};
