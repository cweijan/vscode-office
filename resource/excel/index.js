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

function open(buffer, ext) {
    (async () => {
        const ab = new Uint8Array(buffer).buffer
        const wb = ext.toLowerCase() == ".csv" ? XLSX.read(new TextDecoder("utf-8").decode(ab), { type: "string", raw: true }) : XLSX.read(ab, { type: "array" });
        var { sheets, maxLength, maxCols } = convert(wb);
        window.s = x_spreadsheet("#xspreadsheet", {
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
        }).loadData(sheets);
    })();
}

let fileName;
vscodeEvent.emit("init")
vscodeEvent.on("open", ({ file, path, ext }) => {
    fileName = file
    fetch(path).then(response => response.arrayBuffer()).then(res => { open(res, ext) })
    console.log(path)
}).on("saveDone", () => {
    notie.alert({ type: 1, text: 'Save Success!'}) 
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
    const extName = fileName.split('.').pop().toLowerCase();
    if (extName == 'xlsx' || extName == 'xls' || extName == 'ods') {
        var new_wb = xtos(s.getData());
        var buffer = XLSX.write(new_wb, { bookType: extName, type: "array" });
        const array = [...new Uint8Array(buffer)];
        vscodeEvent.emit('save', array)
    } else if (extName == "csv") {
        const csvContent = XLSX.utils.sheet_to_csv(dataToSheet(s.getData()[0]));
        vscodeEvent.emit('saveCsv', csvContent)
    }
};

window.onkeydown = e => {
    if (isCompose(e) && e.code == "KeyS") {
        export_xlsx()
    }
}
