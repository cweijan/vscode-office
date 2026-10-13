import { SSF } from 'xlsx';
import cellEvaluator from './x-spreadsheet/core/cell';
import { formulam } from './x-spreadsheet/core/formula';
import { formatm } from './x-spreadsheet/core/format';
import type { CellData, CellStyle } from './x-spreadsheet/index';

export function displayCellText(
    cell: CellData,
    style: CellStyle,
    getCell: (x: number, y: number) => CellData | null | undefined,
    evalPaused = false,
) {
    let value: any = cell.text || '';
    if (evalPaused) return value;
    try {
        value = cellEvaluator.render(value, formulam, (x: number, y: number) => getCell(x, y)?.text || '');
    } catch {
        // Unsupported formulas must not prevent other cells/sheets from rendering.
        return cell.text;
    }
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
    if (typeof value === 'number' && !Number.isFinite(value)) return '#NUM!';
    if (cell.numFmt && cell.numFmtFormat === style.format && value !== '' && Number.isFinite(Number(value))) {
        try { return SSF.format(cell.numFmt, Number(value)); } catch { /* Use viewer format below. */ }
    }
    const formatter = style.format ? formatm[style.format] : undefined;
    return formatter ? formatter.render(value) : value;
}
