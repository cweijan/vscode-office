import { inferSchema, initParser } from 'udsv';
import * as XLSX from 'xlsx/dist/xlsx.mini.min.js';

interface SheetInfo {
    name: string;
    rows: any[];
}

export interface ExcelData {
    sheets: SheetInfo[];
    maxCols: number;
    maxLength?: number;
}

const convert = wb => {
    const sheets = [];
    let maxLength = 0;
    let maxCols = 26;
    wb.SheetNames.forEach(name => {
        const sheet = { name, rows: {} };
        const ws = wb.Sheets[name];
        const rows = XLSX.utils.sheet_to_json(ws, { raw: false, header: 1 });
        if (maxLength < rows.length) maxLength = rows.length
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
        const rows = initParser(schema).stringArrs(csvStr).map(row => {
            return row.reduce((colMap, column, j) => {
                colMap[String.fromCharCode(65 + j)] = column
                if (j > maxCols) maxCols = j;
                return colMap
            }, {});
        });
        return {
            maxCols,
            sheets: [{ name: "Sheet1", rows }]
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
        const sheet = { name, rows: [] };
        const ws = wb.Sheets[name];
        const rows = XLSX.utils.sheet_to_json(ws, { raw: false, header: 1 });
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