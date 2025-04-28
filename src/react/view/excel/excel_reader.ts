import { inferSchema, initParser } from 'udsv';
import * as XLSX from 'xlsx/dist/xlsx.mini.min.js';

interface SheetInfo {
    name: string;
    rows: any[];
    cols?: { [key: string]: { width: number } };
}

export interface ExcelData {
    sheets: SheetInfo[];
    maxCols: number;
    maxLength?: number;
}

const MIN_COL_WIDTH = 70;
const MAX_COL_WIDTH = 300;
const CHAR_WIDTH = 8;
const MAX_ROWS_TO_CHECK = 10;

const calculateColWidth = (rows: any[], colIndex: number): number => {
    let maxLength = 0;
    for (let i = 0; i < Math.min(rows.length, MAX_ROWS_TO_CHECK); i++) {
        const cell = rows[i][colIndex];
        if (cell) {
            const length = String(cell).length;
            if (length > maxLength) {
                maxLength = length;
            }
        }
    }
    const width = maxLength * CHAR_WIDTH;
    return Math.min(Math.max(width, MIN_COL_WIDTH), MAX_COL_WIDTH);
};

const convert = wb => {
    const sheets: SheetInfo[] = [];
    let maxLength = 0;
    let maxCols = 26;
    wb.SheetNames.forEach(name => {
        const sheet: SheetInfo = { name, rows: [] };
        const ws = wb.Sheets[name];
        const rows = XLSX.utils.sheet_to_json(ws, { raw: false, header: 1 });
        if (maxLength < rows.length) maxLength = rows.length

        // 计算列宽
        const cols = {};
        for (let i = 0; i < rows[0]?.length || 0; i++) {
            const width = calculateColWidth(rows, i);
            cols[i] = { width };
        }
        sheet.cols = cols;

        sheet.rows = rows.reduce((map, row, i) => {
            const cells = row.reduce((colMap, column, j) => {
                colMap[j] = { text: column }
                return colMap
            }, {});
            map[i] = { cells }
            const colLen = Object.keys(cells).length;
            if (colLen > maxCols) {
                maxCols = colLen;
            }
            return map
        }, {})

        sheets.push(sheet);
    });
    return { sheets, maxLength, maxCols };
};

export function loadSheets(buffer: ArrayBuffer, ext: string): ExcelData {
    const ab = new Uint8Array(buffer).buffer
    const wb = ext.toLowerCase() == ".csv" ? XLSX.read(new TextDecoder("utf-8").decode(ab), { type: "string", raw: true }) : XLSX.read(ab, { type: "array" });
    return convert(wb);
}

export function readCSV(buffer: ArrayBuffer): ExcelData {
    let maxCols = 26;
    const emptySheet = { maxCols, sheets: [{ name: 'Sheet1', rows: [] }] };
    let csvStr = new TextDecoder("utf-8").decode(buffer);
    if (!csvStr) return emptySheet
    try {
        if (!csvStr.includes('\n')) csvStr += '\n';
        const schema = inferSchema(csvStr, { header: () => [] });
        const rows = initParser(schema).stringArrs(csvStr);

        // 计算列宽
        const cols = {};
        for (let i = 0; i < rows[0]?.length || 0; i++) {
            cols[i] = { width: calculateColWidth(rows, i) };
        }

        const processedRows = rows.map(row => {
            return row.reduce((colMap, column, j) => {
                colMap[String.fromCharCode(65 + j)] = column
                if (j > maxCols) maxCols = j;
                return colMap
            }, {});
        });

        return {
            maxCols,
            sheets: [{
                name: "Sheet1",
                rows: processedRows,
                cols
            }]
        }
    } catch (error) {
        console.error(error)
        return { maxCols, sheets: [{ name: 'Sheet1', rows: [{ A: error.message }] }] };
    }
}

export function readXLSX(buffer: ArrayBuffer): ExcelData {
    const wb = XLSX.read(buffer, { type: "array" })
    const sheets: SheetInfo[] = [];
    let maxCols = 26;
    wb.SheetNames.forEach(name => {
        const sheet: SheetInfo = { name, rows: [] };
        const ws = wb.Sheets[name];
        const rows = XLSX.utils.sheet_to_json(ws, { raw: false, header: 1 });

        // 计算列宽
        const cols = {};
        for (let i = 0; i < rows[0]?.length || 0; i++) {
            cols[i] = { width: calculateColWidth(rows, i) };
        }
        sheet.cols = cols;

        sheet.rows = rows.map((row: any) => {
            return row.reduce((colMap, column, j) => {
                colMap[String.fromCharCode(65 + j)] = column
                if (j > maxCols) maxCols = j;
                return colMap
            }, {});
        })
        sheets.push(sheet);
    });
    return { sheets, maxCols };
}