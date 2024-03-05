document.getElementById('_defaultStyles').parentNode.removeChild(document.getElementById('_defaultStyles'))

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

let sheetIns = null;

function loadSheet(buffer, ext) {
    (async () => {
        const ab = new Uint8Array(buffer).buffer
        const wb = ext.toLowerCase() == ".csv" ? XLSX.read(new TextDecoder("utf-8").decode(ab), { type: "string", raw: true }) : XLSX.read(ab, { type: "array" });
        var { sheets, maxLength, maxCols } = convert(wb);
        sheetIns = sheetIns || x_spreadsheet("#xspreadsheet", {
            row: {
                len: maxLength + 50,
                height: 30,
            },
            col: {
                len: maxCols,
            },
            style: {
                align: 'center'
            }
        })
        sheetIns.loadData(sheets);
        const child = document.querySelector('.x-spreadsheet-toolbar-btns>div:nth-child(3)>.x-spreadsheet-icon');
        child.innerHTML = '<svg height="18" viewBox="-11.9 -2 1003.9 995.6" width="18" xmlns="http://www.w3.org/2000/svg"><path d="m12.1 353.9s-24-17.3 4.8-40.4l67.1-60s19.2-20.2 39.5-2.6l619.2 468.8v224.8s-.3 35.3-45.6 31.4z" fill="#2489ca"/><path d="m171.7 498.8-159.6 145.1s-16.4 12.2 0 34l74.1 67.4s17.6 18.9 43.6-2.6l169.2-128.3z" fill="#1070b3"/><path d="m451.9 500 292.7-223.5-1.9-223.6s-12.5-48.8-54.2-23.4l-389.5 354.5z" fill="#0877b9"/><path d="m697.1 976.2c17 17.4 37.6 11.7 37.6 11.7l228.1-112.4c29.2-19.9 25.1-44.6 25.1-44.6v-671.2c0-29.5-30.2-39.7-30.2-39.7l-197.7-95.3c-43.2-26.7-71.5 4.8-71.5 4.8s36.4-26.2 54.2 23.4v887.5c0 6.1-1.3 12.1-3.9 17.5-5.2 10.5-16.5 20.3-43.6 16.2z" fill="#3c99d4"/></svg>'
        child.onclick = e => {
            handler.emit("editInVSCode", true)
            e.stopPropagation();
        }
    })();
}

let extName;
vscodeEvent.emit("init")
vscodeEvent.on("open", ({ path, ext }) => {
    extName = ext.replace('.', '');
    fetch(path).then(response => response.arrayBuffer()).then(res => { loadSheet(res, ext) })
}).on("saveDone", () => {
    notie.alert({ type: 1, text: 'Save Success!' })
})

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
        ws = dataToSheet(xws)
        XLSX.utils.book_append_sheet(out, ws, xws.name);
    });
    return out;
}

function export_xlsx() {
    if (['xlsx', 'xls', 'ods'].includes(extName)) {
        var new_wb = xtos(sheetIns.getData());
        var buffer = XLSX.write(new_wb, { bookType: extName, type: "array" });
        const array = [...new Uint8Array(buffer)];
        vscodeEvent.emit('save', array)
    } else if (extName == "csv") {
        const csvContent = XLSX.utils.sheet_to_csv(dataToSheet(sheetIns.getData()[0]));
        vscodeEvent.emit('saveCsv', csvContent)
    }
};

window.onkeydown = e => {
    if (isCompose(e) && e.code == "KeyS") {
        export_xlsx()
    }
}
