import type { SheetData } from './x-spreadsheet/index';

export interface FindMatch {
    sheetIndex: number;
    ri: number;
    ci: number;
}

export interface FindOptions {
    matchCase?: boolean;
    wholeCell?: boolean;
    allSheets?: boolean;
}

function normalizeText(text: string, matchCase: boolean): string {
    return matchCase ? text : text.toLowerCase();
}

function cellMatches(cellText: string, query: string, options: FindOptions): boolean {
    const hay = normalizeText(cellText, !!options.matchCase);
    const needle = normalizeText(query, !!options.matchCase);
    if (!needle) return false;
    if (options.wholeCell) return hay === needle;
    return hay.includes(needle);
}

function iterSheetCells(
    sheet: SheetData,
    cb: (ri: number, ci: number, text: string) => void,
) {
    const rows = sheet.rows;
    if (!rows?.len) return;
    for (let ri = 0; ri < rows.len; ri += 1) {
        const row = rows[ri];
        if (!row || typeof row !== 'object' || !('cells' in row)) continue;
        for (const ciKey of Object.keys(row.cells ?? {})) {
            const ci = Number(ciKey);
            if (Number.isNaN(ci)) continue;
            const text = row.cells[ci]?.text ?? '';
            if (text) cb(ri, ci, text);
        }
    }
}

function compareMatch(a: FindMatch, b: FindMatch): number {
    if (a.sheetIndex !== b.sheetIndex) return a.sheetIndex - b.sheetIndex;
    if (a.ri !== b.ri) return a.ri - b.ri;
    return a.ci - b.ci;
}

export function findAllInSheets(
    sheets: SheetData[],
    query: string,
    options: FindOptions,
    activeSheetIndex = 0,
): FindMatch[] {
    if (!query) return [];
    const matches: FindMatch[] = [];
    const indices = options.allSheets
        ? sheets.map((_, i) => i)
        : [Math.min(Math.max(0, activeSheetIndex), Math.max(0, sheets.length - 1))];
    for (let i = 0; i < indices.length; i += 1) {
        const sheetIndex = indices[i];
        const sheet = sheets[sheetIndex];
        if (!sheet) continue;
        iterSheetCells(sheet, (ri, ci, text) => {
            if (cellMatches(text, query, options)) {
                matches.push({ sheetIndex, ri, ci });
            }
        });
    }
    matches.sort(compareMatch);
    return matches;
}

export function findNextMatch(
    sheets: SheetData[],
    query: string,
    from: FindMatch,
    options: FindOptions,
    activeSheetIndex: number,
    backward = false,
): FindMatch | null {
    const all = findAllInSheets(sheets, query, options, activeSheetIndex);
    if (!all.length) return null;
    const currentIndex = all.findIndex(
        (m) => m.sheetIndex === from.sheetIndex && m.ri === from.ri && m.ci === from.ci,
    );
    if (currentIndex < 0) {
        return backward ? all[all.length - 1] : all[0];
    }
    const nextIndex = backward
        ? (currentIndex - 1 + all.length) % all.length
        : (currentIndex + 1) % all.length;
    return all[nextIndex];
}

export function findFirstMatch(
    sheets: SheetData[],
    query: string,
    options: FindOptions,
    activeSheetIndex = 0,
): FindMatch | null {
    const all = findAllInSheets(sheets, query, options, activeSheetIndex);
    return all[0] ?? null;
}

export function replaceCellText(
    sheets: SheetData[],
    match: FindMatch,
    findText: string,
    replaceText: string,
    options: FindOptions,
): boolean {
    const sheet = sheets[sheetIndexSafe(sheets, match.sheetIndex)];
    const row = sheet?.rows?.[match.ri];
    if (!row || typeof row !== 'object' || !('cells' in row)) return false;
    const cell = row.cells?.[match.ci];
    if (!cell) return false;
    const current = cell.text ?? '';
    let next = current;
    if (options.wholeCell && cellMatches(current, findText, options)) {
        next = replaceText;
    } else {
        const flags = options.matchCase ? 'g' : 'gi';
        const escaped = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        next = current.replace(new RegExp(escaped, flags), replaceText);
    }
    if (next === current) return false;
    cell.text = next;
    return true;
}

function sheetIndexSafe(sheets: SheetData[], index: number): SheetData | undefined {
    if (index < 0 || index >= sheets.length) return undefined;
    return sheets[index];
}

export function replaceAllInSheets(
    sheets: SheetData[],
    findText: string,
    replaceText: string,
    options: FindOptions,
    activeSheetIndex = 0,
): number {
    const matches = findAllInSheets(sheets, findText, options, activeSheetIndex);
    let count = 0;
    for (let i = 0; i < matches.length; i += 1) {
        if (replaceCellText(sheets, matches[i], findText, replaceText, options)) {
            count += 1;
        }
    }
    return count;
}
