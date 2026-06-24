import type * as ExcelJS from '@cweijan/exceljs';
import type { CellData, SheetData } from './x-spreadsheet/index';

export type StoredSheetProtection = Record<string, unknown>;

const DEFAULT_PROTECT_OPTIONS: Partial<ExcelJS.WorksheetProtection> = {
    selectLockedCells: true,
    selectUnlockedCells: true,
};

function isRowData(row: unknown): row is { cells: Record<number, CellData> } {
    return row != null && typeof row === 'object' && 'cells' in row;
}

export function readWorksheetProtection(worksheet: ExcelJS.Worksheet): StoredSheetProtection | undefined {
    const ws = worksheet as ExcelJS.Worksheet & { sheetProtection?: StoredSheetProtection };
    const sp = ws.sheetProtection ?? worksheet.model?.sheetProtection;
    if (!sp || typeof sp !== 'object') return undefined;
    return { ...sp };
}

export function isWorksheetProtected(worksheet: ExcelJS.Worksheet): boolean {
    return readWorksheetProtection(worksheet) != null;
}

/** 受保护工作表中：默认锁定；仅 protection.locked === false 的单元格可编辑 */
export function readCellEditableFromExcel(cell: ExcelJS.Cell, sheetProtected: boolean): boolean | undefined {
    if (!sheetProtected) return undefined;
    if (cell.protection?.locked === false) return true;
    return false;
}

function protectionOptionsFromStored(stored: StoredSheetProtection): Partial<ExcelJS.WorksheetProtection> {
    const {
        password,
        hashValue,
        saltValue,
        spinCount,
        algorithmName,
        ...rest
    } = stored;
    return rest as Partial<ExcelJS.WorksheetProtection>;
}

export async function writeWorksheetProtection(
    worksheet: ExcelJS.Worksheet,
    sheetData: SheetData,
): Promise<void> {
    const { rows, sheetProtection } = sheetData;
    let hasLockedCells = false;

    if (rows?.len) {
        for (let ri = 0; ri < rows.len; ri += 1) {
            const row = rows[ri];
            if (!isRowData(row) || !row.cells) continue;
            for (const ciKey of Object.keys(row.cells)) {
                const cellData = row.cells[Number(ciKey)];
                if (cellData?.editable === false) {
                    hasLockedCells = true;
                    break;
                }
            }
            if (hasLockedCells) break;
        }
    }

    const shouldProtect = sheetProtection != null || hasLockedCells;
    if (!shouldProtect) return;

    if (rows?.len) {
        for (let ri = 0; ri < rows.len; ri += 1) {
            const row = rows[ri];
            if (!isRowData(row) || !row.cells) continue;
            for (const ciKey of Object.keys(row.cells)) {
                const ci = Number(ciKey);
                if (Number.isNaN(ci)) continue;
                const cellData = row.cells[ci];
                const excelCell = worksheet.getCell(ri + 1, ci + 1);
                excelCell.protection = {
                    locked: cellData.editable === false,
                };
            }
        }
    }

    const options = sheetProtection
        ? protectionOptionsFromStored(sheetProtection)
        : DEFAULT_PROTECT_OPTIONS;
    await worksheet.protect('', options);
}
