import { handler } from "../../util/vscode";
import * as XLSX from 'xlsx/dist/xlsx.mini.min.js';
import Spreadsheet from "x-data-spreadsheet";

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
    return XLSX.utils.aoa_to_sheet(aoa);
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