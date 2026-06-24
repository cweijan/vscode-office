import type * as ExcelJS from '@cweijan/exceljs';
import type { CellStyle } from './x-spreadsheet/index';

const BORDER_FROM_EXCEL: Record<string, string> = {
    thin: 'thin',
    hair: 'dotted',
    dotted: 'dotted',
    medium: 'medium',
    mediumDashed: 'dashed',
    mediumDashDot: 'dashed',
    mediumDashDotDot: 'dashed',
    dashed: 'dashed',
    dashDot: 'dashed',
    dashDotDot: 'dashed',
    slantDashDot: 'dashed',
    thick: 'thick',
    double: 'double',
};

const BORDER_TO_EXCEL: Record<string, ExcelJS.BorderStyle> = {
    thin: 'thin',
    medium: 'medium',
    thick: 'thick',
    dashed: 'dashed',
    dotted: 'dotted',
    double: 'double',
};

const VALIGN_FROM_EXCEL: Record<string, CellStyle['valign']> = {
    top: 'top',
    middle: 'middle',
    bottom: 'bottom',
};

const VALIGN_TO_EXCEL: Record<string, ExcelJS.Alignment['vertical']> = {
    top: 'top',
    middle: 'middle',
    bottom: 'bottom',
};

const FORMAT_TO_NUMFMT: Record<string, string> = {
    normal: 'General',
    text: '@',
    number: '#,##0.00',
    percent: '0.00%',
    rmb: '¥#,##0.00',
    usd: '$#,##0.00',
    eur: '€#,##0.00',
    date: 'yyyy/m/d',
    time: 'h:mm:ss',
    datetime: 'yyyy/m/d h:mm',
    duration: '[h]:mm:ss',
};

const NUMFMT_PATTERNS: { pattern: RegExp; format: string }[] = [
    { pattern: /^general$/i, format: 'normal' },
    { pattern: /^@$/, format: 'text' },
    { pattern: /%/, format: 'percent' },
    { pattern: /[¥￥]/, format: 'rmb' },
    { pattern: /\$/, format: 'usd' },
    { pattern: /€/, format: 'eur' },
    { pattern: /\[h\]:mm/i, format: 'duration' },
    { pattern: /yyyy.*h:mm|m\/d.*h:mm/i, format: 'datetime' },
    { pattern: /h:mm|hh:mm/i, format: 'time' },
    { pattern: /yyyy|m\/d|d\/m|dd\/mm/i, format: 'date' },
    { pattern: /#|0\.0|0,/, format: 'number' },
];

function numFmtToSpreadsheetFormat(numFmt?: string): string | undefined {
    if (!numFmt || numFmt === 'General') return undefined;
    for (let i = 0; i < NUMFMT_PATTERNS.length; i += 1) {
        if (NUMFMT_PATTERNS[i].pattern.test(numFmt)) {
            return NUMFMT_PATTERNS[i].format;
        }
    }
    return undefined;
}

function spreadsheetFormatToNumFmt(format?: string): string | undefined {
    if (!format || format === 'normal') return undefined;
    return FORMAT_TO_NUMFMT[format];
}

export function colorToHex(color?: Partial<ExcelJS.Color>): string | undefined {
    if (!color?.argb) return undefined;
    const argb = color.argb.replace(/^#/, '');
    if (argb.length === 8) return `#${argb.slice(2).toLowerCase()}`;
    if (argb.length === 6) return `#${argb.toLowerCase()}`;
    return undefined;
}

export function hexToArgb(hex?: string): string | undefined {
    if (!hex) return undefined;
    const normalized = hex.replace(/^#/, '');
    if (normalized.length === 6) return `FF${normalized.toUpperCase()}`;
    if (normalized.length === 8) return normalized.toUpperCase();
    return undefined;
}

function borderSideToSpreadsheet(side?: Partial<ExcelJS.Border>): string[] | undefined {
    if (!side?.style) return undefined;
    const style = BORDER_FROM_EXCEL[side.style] ?? 'thin';
    const color = colorToHex(side.color) ?? '#000000';
    return [style, color];
}

function bordersToSpreadsheet(borders?: Partial<ExcelJS.Borders>): CellStyle['border'] | undefined {
    if (!borders) return undefined;
    const border: CellStyle['border'] = {};
    const top = borderSideToSpreadsheet(borders.top);
    const right = borderSideToSpreadsheet(borders.right);
    const bottom = borderSideToSpreadsheet(borders.bottom);
    const left = borderSideToSpreadsheet(borders.left);
    if (top) border.top = top;
    if (right) border.right = right;
    if (bottom) border.bottom = bottom;
    if (left) border.left = left;
    return Object.keys(border).length > 0 ? border : undefined;
}

function borderSideToExcelJs(side?: string[]): Partial<ExcelJS.Border> | undefined {
    if (!side?.[0]) return undefined;
    const style = BORDER_TO_EXCEL[side[0]] ?? 'thin';
    const argb = hexToArgb(side[1]);
    return {
        style,
        color: argb ? { argb } : undefined,
    };
}

function bordersToExcelJs(border?: CellStyle['border']): Partial<ExcelJS.Borders> | undefined {
    if (!border) return undefined;
    const borders: Partial<ExcelJS.Borders> = {};
    const top = borderSideToExcelJs(border.top);
    const right = borderSideToExcelJs(border.right);
    const bottom = borderSideToExcelJs(border.bottom);
    const left = borderSideToExcelJs(border.left);
    if (top) borders.top = top;
    if (right) borders.right = right;
    if (bottom) borders.bottom = bottom;
    if (left) borders.left = left;
    return Object.keys(borders).length > 0 ? borders : undefined;
}

export function excelJsCellToStyle(cell: ExcelJS.Cell): CellStyle | null {
    const style: CellStyle = {};
    let hasStyle = false;

    const font = cell.font;
    if (font) {
        const fontStyle: NonNullable<CellStyle['font']> = {};
        let hasFont = false;
        if (font.name) {
            fontStyle.name = font.name;
            hasFont = true;
        }
        if (font.size) {
            fontStyle.size = font.size;
            hasFont = true;
        }
        if (font.bold) {
            fontStyle.bold = true;
            hasFont = true;
        }
        if (font.italic) {
            fontStyle.italic = true;
            hasFont = true;
        }
        if (hasFont) {
            style.font = fontStyle;
            hasStyle = true;
        }
        const color = colorToHex(font.color);
        if (color) {
            style.color = color;
            hasStyle = true;
        }
        if (font.strike) {
            style.strike = true;
            hasStyle = true;
        }
        if (font.underline && font.underline !== 'none' && font.underline !== false) {
            style.underline = true;
            hasStyle = true;
        }
    }

    const alignment = cell.alignment;
    if (alignment) {
        if (alignment.horizontal === 'left' || alignment.horizontal === 'center' || alignment.horizontal === 'right') {
            style.align = alignment.horizontal;
            hasStyle = true;
        }
        const valign = alignment.vertical ? VALIGN_FROM_EXCEL[alignment.vertical] : undefined;
        if (valign) {
            style.valign = valign;
            hasStyle = true;
        }
        if (alignment.wrapText) {
            style.textwrap = true;
            hasStyle = true;
        }
    }

    const fill = cell.fill;
    if (fill && fill.type === 'pattern') {
        const bgcolor = colorToHex(fill.fgColor) ?? colorToHex(fill.bgColor);
        if (bgcolor && bgcolor !== '#ffffff') {
            style.bgcolor = bgcolor;
            hasStyle = true;
        }
    }

    if (cell.border) {
        const border = bordersToSpreadsheet(cell.border);
        if (border) {
            style.border = border;
            hasStyle = true;
        }
    }

    const numFmt = cell.numFmt;
    const format = numFmtToSpreadsheetFormat(numFmt);
    if (format) {
        style.format = format;
        hasStyle = true;
    }

    return hasStyle ? style : null;
}

export function applySpreadsheetStyle(cell: ExcelJS.Cell, style: CellStyle) {
    const font: Partial<ExcelJS.Font> = { ...(cell.font ?? {}) };

    if (style.font) {
        if (style.font.name) font.name = style.font.name;
        if (style.font.size) font.size = style.font.size;
        if (style.font.bold != null) font.bold = style.font.bold;
        if (style.font.italic != null) font.italic = style.font.italic;
    }
    if (style.color) {
        const argb = hexToArgb(style.color);
        if (argb) font.color = { argb };
    }
    if (style.strike != null) font.strike = style.strike;
    if (style.underline != null) font.underline = style.underline ? 'single' : false;
    if (Object.keys(font).length > 0) cell.font = font;

    if (style.align || style.valign || style.textwrap != null) {
        const alignment: Partial<ExcelJS.Alignment> = { ...(cell.alignment ?? {}) };
        if (style.align) alignment.horizontal = style.align;
        if (style.valign) alignment.vertical = VALIGN_TO_EXCEL[style.valign];
        if (style.textwrap != null) alignment.wrapText = style.textwrap;
        cell.alignment = alignment;
    }

    if (style.bgcolor) {
        const argb = hexToArgb(style.bgcolor);
        if (argb) {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb },
            };
        }
    }

    const border = bordersToExcelJs(style.border);
    if (border) cell.border = border;

    const numFmt = spreadsheetFormatToNumFmt(style.format);
    if (numFmt) cell.numFmt = numFmt;
}

export class StyleRegistry {
    private styles: CellStyle[] = [];

    add(style: CellStyle | null): number | undefined {
        if (!style) return undefined;
        for (let i = 0; i < this.styles.length; i += 1) {
            if (JSON.stringify(this.styles[i]) === JSON.stringify(style)) {
                return i;
            }
        }
        this.styles.push(style);
        return this.styles.length - 1;
    }

    getStyles(): CellStyle[] {
        return this.styles;
    }
}
