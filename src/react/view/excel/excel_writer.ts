import { handler } from "../../util/vscode";
import * as XLSX from 'xlsx/dist/xlsx.mini.min.js';
import Spreadsheet from "x-data-spreadsheet";

const DEFAULT_COL_WIDTH = 100;

function getColWidth(cols: Record<string, any>, ci: number) {
    const col = cols[ci];
    if (col && col.width != null) return col.width;
    return DEFAULT_COL_WIDTH;
}

function applyColWidths(ws: XLSX.WorkSheet, xws: { cols?: Record<string, any> }) {
    const cols = xws.cols;
    if (!cols || !cols.len) return;
    const colWidths = [];
    for (let ci = 0; ci < cols.len; ci += 1) {
        colWidths.push({ wpx: getColWidth(cols, ci) });
    }
    ws['!cols'] = colWidths;
}

function dataToSheet(xws) {
    var aoa = [[]];
    var rowobj = xws.rows;
    for (var ri = 0; ri < rowobj.len; ++ri) {
        var row = rowobj[ri];
        if (!row) continue;
        aoa[ri] = [];
        /* eslint-disable no-loop-func */
        Object.keys(row.cells).forEach(function (k) {
            var idx = +k;
            if (isNaN(idx)) return;
            aoa[ri][idx] = row.cells[k].text;
        });
    }
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    applyColWidths(ws, xws);
    return ws;
}

function xtos(sdata) {
    var out = XLSX.utils.book_new();
    sdata.forEach(function (xws) {
        const ws = dataToSheet(xws)
        XLSX.utils.book_append_sheet(out, ws, xws.name);
    });
    return out;
}

export function export_xlsx(spreadSheet: Spreadsheet, extName: string) {
    extName = extName.replace('.', '')
    if (extName == 'xlsx' || extName == 'xls' || extName == 'ods') {
        var new_wb = xtos(spreadSheet.getData());
        var buffer = XLSX.write(new_wb, { bookType: extName, type: "array" });
        const array = [...new Uint8Array(buffer)];
        handler.emit('save', array)
    } else if (extName == "csv") {
        const csvContent = XLSX.utils.sheet_to_csv(dataToSheet(spreadSheet.getData()[0]));
        handler.emit('save', csvContent)
    }
};