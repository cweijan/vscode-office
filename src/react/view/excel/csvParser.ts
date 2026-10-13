/**
 * String-array parsing extracted and adapted from uDSV v0.5.3.
 * Source: https://github.com/leeoniya/uDSV (dist/uDSV.cjs.js, parse).
 * Retains its indexOf/slice scanning and quoted/unquoted field states.
 * Omits schema/type inference and streaming, which the viewer does not use.
 * Local fixes: variable-width records, literal quotes, empty rows, EOF,
 * mixed line endings and explicit errors for unclosed quoted fields.
 *
 * MIT License
 *
 * Copyright (c) 2023 Leon Sorokin
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
function readRows(csvStr: string, colDelim: string, limit = Infinity): string[][] {
    const rows: string[][] = [];
    const length = csvStr.length;
    if (!length) return rows;

    // uDSV's unenclosed fast path, adapted to variable-width rows. Splitting
    // each record avoids assuming the first record defines the column count.
    const rowBreak = /\r\n|\r|\n/g;
    if (csvStr.indexOf('"') === -1) {
        let linePos = 0;
        let match: RegExpExecArray | null;
        while ((match = rowBreak.exec(csvStr))) {
            rows.push(csvStr.slice(linePos, match.index).split(colDelim));
            if (rows.length >= limit) return rows;
            linePos = rowBreak.lastIndex;
        }
        if (linePos < length) rows.push(csvStr.slice(linePos).split(colDelim));
        return rows;
    }

    const colEncl = '"';
    const colEnclChar = 34;
    const colDelimChar = colDelim.charCodeAt(0);
    let pos = 0;
    let row: string[] = [];
    // uDSV states: 0 = field start, 1 = unquoted, 2 = quoted.
    let inCol = 0;
    let v = '';
    let linePos = 0;
    let nextColPos = -1;
    let nextRowPos = -1;

    while (pos < length) {
        const c = csvStr.charCodeAt(pos);
        if (inCol === 0 && c === colEnclChar) {
            inCol = 2;
            pos += 1;
        } else if (inCol !== 2 && (c === colDelimChar || c === 13 || c === 10)) {
            row.push(v);
            v = '';
            inCol = 0;
            pos += 1;
            if (c !== colDelimChar) {
                if (c === 13 && csvStr.charCodeAt(pos) === 10) pos += 1;
                rows.push(row);
                if (rows.length >= limit) return rows;
                row = [];
                linePos = pos;
            }
        } else if (inCol !== 2) {
            inCol = 1;
            // uDSV jumps to a delimiter with indexOf rather than reading each
            // character. Cache both boundaries: short comment records must
            // stop at EOL even if the next comma is on a later record.
            if (nextColPos < pos) {
                nextColPos = csvStr.indexOf(colDelim, pos);
                if (nextColPos === -1) nextColPos = length;
            }
            if (nextRowPos < pos) {
                rowBreak.lastIndex = pos;
                nextRowPos = rowBreak.exec(csvStr)?.index ?? length;
            }
            const pos2 = Math.min(nextColPos, nextRowPos);
            v += csvStr.slice(pos, pos2);
            pos = pos2;
        }

        if (inCol === 2) {
            // uDSV's quote scan and doubled-quote escape handling. Only a
            // quote at field start enters this state; a"b stays literal.
            while (true) {
                const pos2 = csvStr.indexOf(colEncl, pos);
                if (pos2 === -1) throw new Error('CSV contains an unterminated quoted field.');
                v += csvStr.slice(pos, pos2);
                pos = pos2 + 1;
                if (csvStr.charCodeAt(pos) === colEnclChar) {
                    v += colEncl;
                    pos += 1;
                } else {
                    // Remain in the field after closing, including for "".
                    inCol = 1;
                    break;
                }
            }
        }
    }

    // Preserve trailing empty fields and single-column records. A terminal
    // newline closes the last record rather than creating an extra one.
    if (linePos < length) {
        row.push(v);
        rows.push(row);
    }
    return rows;
}

export function parseCsv(text: string, delimiter?: string): { rows: string[][]; delimiter: string } {
    if (!delimiter) {
        let bestScore = 0;
        delimiter = ',';
        for (const candidate of [',', '\t', ';', '|']) {
            try {
                const counts = new Map<number, number>();
                for (const row of readRows(text, candidate, 100)) {
                    if (row.length > 1) counts.set(row.length, (counts.get(row.length) ?? 0) + 1);
                }
                const score = Math.max(0, ...counts.values());
                if (score > bestScore) {
                    bestScore = score;
                    delimiter = candidate;
                }
            } catch {
                // A wrong delimiter can make an ordinary quote look like an
                // enclosure. Let the selected delimiter report real errors.
            }
        }
    }
    return { rows: readRows(text, delimiter), delimiter };
}
