import { resolveLayout } from '../theme/exportThemeCss';
import type { ExportThemeSettings } from '../types';

function resolveDocxFont(fontFamily: string | undefined): string | undefined {
    if (!fontFamily || fontFamily === 'inherit' || fontFamily.includes(',')) {
        return undefined;
    }
    return fontFamily.trim();
}

/**
 * Convert CSS font size to html-to-docx fontSize (half-points, HIP).
 */
function resolveDocxFontSize(fontSize: string | undefined): number {
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

function buildDocxDocumentOptions(exportTheme: ExportThemeSettings | null | undefined) {
    const { fontSize, fontFamily } = resolveLayout(exportTheme || {} as ExportThemeSettings);
    const font = resolveDocxFont(fontFamily);
    const docxFontSize = resolveDocxFontSize(fontSize);
    const options: { fontSize: number; complexScriptFontSize: number; font?: string } = {
        fontSize: docxFontSize,
        complexScriptFontSize: docxFontSize,
    };
    if (font) {
        options.font = font;
    }
    return options;
}

export {
    resolveDocxFontSize,
    buildDocxDocumentOptions,
};
