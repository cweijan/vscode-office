import '@antv/s2-react/dist/style.min.css';
import { useEffect, useState } from "react";
import { SheetComponent, SheetComponentOptions } from '@antv/s2-react';
import { readCSV, readXLSX } from "./excel/excel_reader.ts";
import { handler, isCompose } from "../util/vscode.ts";
import * as XLSX from 'xlsx'

export default function ExcelViewer() {
    const [s2DataConfig, setS2DataConfig] = useState({
        fields: { columns: Array(20).fill(0).map((_, i) => (String.fromCharCode(65 + i))) },
        data: []
    })
    function loadSheet(buffer, ext) {
        (async () => {
            let start = new Date().getTime();
            const ab = new Uint8Array(buffer).buffer
            var { sheets, maxCols } = ext.toLowerCase() == ".csv" ? readCSV(ab) : readXLSX(ab);
            if (import.meta.env.DEV) {
                console.log('Load time:', new Date().getTime() - start, 'ms');
            }
            setS2DataConfig({
                fields: {
                    columns: Array(maxCols).fill(0).map((_, i) => (String.fromCharCode(65 + i)))
                },
                data: sheets[0].rows,
            })
        })();
    }

    let extName;
    useEffect(() => {
        handler.on("open", ({ path, ext }) => {
            console.log('open')
            extName = ext.replace('.', '');
            fetch(path).then(response => response.arrayBuffer()).then(res => { loadSheet(res, ext) })
        }).on("saveDone", () => {
            // notie.alert({ type: 1, text: 'Save Success!' })
        }).emit("init")
    }, [])

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

    function export_xlsx() {
        // if (['xlsx', 'xls', 'ods'].includes(extName)) {
        //     var new_wb = xtos(sheetIns.getData());
        //     var buffer = XLSX.write(new_wb, { bookType: extName, type: "array" });
        //     const array = [...new Uint8Array(buffer)];
        //     handler.emit('save', array)
        // } else if (extName == "csv") {
        //     const csvContent = XLSX.utils.sheet_to_csv(dataToSheet(sheetIns.getData()[0]));
        //     handler.emit('saveCsv', csvContent)
        // }
    };

    window.onkeydown = e => {
        if (isCompose(e) && e.code == "KeyS") {
            export_xlsx()
        }
    }

    const s2Options: SheetComponentOptions = {
        width: window.innerWidth - 20,
        height: window.innerHeight - 20,
        style: {
            layoutWidthType: 'compact'
        },
        // seriesNumber: {
        //     enable: true,
        //     text: '',
        // },
        placeholder: '',
    };

    return (
        <SheetComponent
            dataCfg={s2DataConfig}
            options={s2Options}
            sheetType="table"
        />
    )
}