import ExcelJS from 'exceljs';
import { inferSchema, initParser } from 'udsv';

interface RowMap {
    [rowIndex: number]: {
        cells: {
            [colIndex: number]: { text: string };
        };
    };
}

interface SheetInfo {
    name: string;
    rows: RowMap;
    cols?: { [key: number]: { width: number } };
}

export interface ExcelData {
    sheets: SheetInfo[];
    maxCols: number;
    maxLength?: number;
}

const MIN_COL_WIDTH = 70;
const MAX_COL_WIDTH = 300;
const DEFAULT_COL_WIDTH = 100;
const CHAR_WIDTH = 8;
const MAX_ROWS_TO_CHECK = 10;

const clampColWidth = (width: number) => Math.min(Math.max(width, MIN_COL_WIDTH), MAX_COL_WIDTH);

const calculateColWidth = (rows: any[], colIndex: number): number => {
    let maxLength = 0;
    for (let i = 0; i < Math.min(rows.length, MAX_ROWS_TO_CHECK); i += 1) {
        const cell = rows[i][colIndex];
        if (cell) {
            const length = String(cell).length;
            if (length > maxLength) {
                maxLength = length;
            }
        }
    }
    return clampColWidth(maxLength * CHAR_WIDTH);
};

const excelColWidthToPx = (width?: number) => {
    if (width == null) return null;
    return Math.round(width * 7 + 5);
};

const buildCsvCols = (rows: any[][], colCount: number) => {
    const cols: Record<number, { width: number }> = {};
    for (let i = 0; i < colCount; i += 1) {
        cols[i] = { width: calculateColWidth(rows, i) };
    }
    return cols;
};

const buildColsFromWorksheet = (worksheet: ExcelJS.Worksheet, colCount: number) => {
    const cols: Record<number, { width: number }> = {};
    for (let i = 1; i <= colCount; i += 1) {
        const width = excelColWidthToPx(worksheet.getColumn(i).width) ?? DEFAULT_COL_WIDTH;
        cols[i - 1] = { width: clampColWidth(width) };
    }
    return cols;
};

const formatCellText = (cell: ExcelJS.Cell) => {
    if (cell.value == null) return '';
    if (cell.text) return cell.text;
    if (cell.value instanceof Date) {
        return cell.value.toISOString().slice(0, 10);
    }
    return String(cell.value);
};

const convertExcelJsWorksheet = (worksheet: ExcelJS.Worksheet): Pick<SheetInfo, 'rows' | 'cols'> => {
    const rows: RowMap = {};
    let maxCols = 0;

    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        const ri = rowNumber - 1;
        const cells: Record<number, { text: string }> = {};
        row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
            const ci = colNumber - 1;
            cells[ci] = { text: formatCellText(cell) };
            if (ci + 1 > maxCols) maxCols = ci + 1;
        });
        rows[ri] = { cells };
    });

    const colCount = Math.max(maxCols, worksheet.columnCount || 0);
    return {
        rows,
        cols: buildColsFromWorksheet(worksheet, colCount),
    };
};

const convertExcelJsWorkbook = (workbook: ExcelJS.Workbook): ExcelData => {
    const sheets: SheetInfo[] = [];
    let maxLength = 0;
    let maxCols = 26;

    for (const worksheet of workbook.worksheets) {
        const converted = convertExcelJsWorksheet(worksheet);
        const rowCount = Object.keys(converted.rows).length;
        if (maxLength < rowCount) maxLength = rowCount;

        const colLen = Object.keys(converted.cols).length;
        if (colLen > maxCols) maxCols = colLen;

        sheets.push({
            name: worksheet.name,
            rows: converted.rows,
            cols: converted.cols,
        });
    }

    return { sheets, maxLength, maxCols };
};

const loadWithExcelJs = async (buffer: ArrayBuffer): Promise<ExcelData> => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    return convertExcelJsWorkbook(workbook);
};

const loadCsv = (buffer: ArrayBuffer): ExcelData => {
    let maxCols = 26;
    const emptySheet = { maxCols, sheets: [{ name: 'Sheet1', rows: [] }] };
    let csvStr = new TextDecoder('utf-8').decode(buffer);
    if (!csvStr) return emptySheet;

    try {
        if (!csvStr.includes('\n')) csvStr += '\n';
        const schema = inferSchema(csvStr, { header: () => [] });
        const rows = initParser(schema).stringArrs(csvStr);
        const colCount = rows[0]?.length || 0;

        const processedRows: RowMap = {};
        for (let i = 0; i < rows.length; i += 1) {
            const row = rows[i];
            const cells: Record<number, { text: string }> = {};
            for (let j = 0; j < row.length; j += 1) {
                cells[j] = { text: row[j] == null ? '' : String(row[j]) };
                if (j + 1 > maxCols) maxCols = j + 1;
            }
            processedRows[i] = { cells };
        }

        return {
            maxCols,
            maxLength: rows.length,
            sheets: [{
                name: 'Sheet1',
                rows: processedRows,
                cols: buildCsvCols(rows, colCount),
            }],
        };
    } catch (error) {
        console.error(error);
        return { maxCols, sheets: [{ name: 'Sheet1', rows: [{ cells: { 0: { text: error.message } } }] }] };
    }
};

const isCsvExt = (ext: string) => ext.toLowerCase().includes('csv');

export async function loadSheets(buffer: ArrayBuffer, ext: string): Promise<ExcelData> {
    if (isCsvExt(ext)) {
        return loadCsv(buffer);
    }
    return loadWithExcelJs(buffer);
}

export function readCSV(buffer: ArrayBuffer): ExcelData {
    return loadCsv(buffer);
}

export async function readExcel(buffer: ArrayBuffer): Promise<ExcelData> {
    return loadWithExcelJs(buffer);
}
