document.getElementById('_defaultStyles').parentNode.removeChild(document.getElementById('_defaultStyles'))
const vscode = typeof (acquireVsCodeApi) != "undefined" ? acquireVsCodeApi() : null;
const postMessage = (message) => { if (vscode) { vscode.postMessage(message) } }

const getVscodeEvent = () => {
    let events = {}
    let init = false;
    function receive({ data }) {
        if (!data)
            return;
        if (events[data.type]) {
            events[data.type](data.content);
        }
    }
    return {
        on(event, data) {
            this.tryInit();
            events[event] = data
            return this;
        },
        emit(event, data) {
            this.tryInit();
            postMessage({ type: event, content: data })
        },
        tryInit() {
            if (init) return;
            init = true;
            window.addEventListener('message', receive)
        },
        destroy() {
            window.removeEventListener('message', receive)
            this.init = false;
        }
    }
}

const convert = wb => {
    const sheets = [];
    let maxLength = 0;
    wb.SheetNames.forEach(name => {
        const sheet = { name, rows: {} };
        const ws = wb.Sheets[name];
        const rows = XLSX.utils.sheet_to_json(ws, { raw: false, header: 1 });
        if (maxLength < rows.length) maxLength = rows.length
        sheet.rows = rows.reduce((map, row, i) => {
            map[i] = {
                cells: row.reduce((colMap, column, j) => {
                    colMap[j] = { text: column }
                    return colMap
                }, {})
            }
            return map
        }, {})
        sheets.push(sheet);
    });
    return { sheets, maxLength };
};

function open(buffer, ext) {
    (async () => {
        const ab = new Uint8Array(buffer).buffer
        const wb = ext.toLowerCase() == ".csv" ? XLSX.read(new TextDecoder("utf-8").decode(ab), { type: "string", raw: true }) : XLSX.read(ab, { type: "array" });
        var { sheets, maxLength } = convert(wb);
        window.s = x_spreadsheet("#xspreadsheet", {
            row: {
                len: maxLength + 50,
                height: 30,
            },
            style: {
                align: 'center'
            }
        }).loadData(sheets);
    })();
}

let fileName;
const vscodeEvent = getVscodeEvent();
vscodeEvent.emit("init")
vscodeEvent.on("open", ({ file, content, ext }) => {
    fileName = file
    open(content.data, ext)
}).on("saveDone", () => {
    toastr.success('Save Success!')
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
    if (extName == 'xlsx' || extName == 'xls') {
        var new_wb = xtos(s.getData());
        var buffer = XLSX.write(new_wb, { bookType: extName, type: "array" });
        const array = [...new Uint8Array(buffer)];
        vscodeEvent.emit('save', array)
    } else if (extName == "csv") {
        const csvContent = XLSX.utils.sheet_to_csv(dataToSheet(s.getData()[0]));
        vscodeEvent.emit('saveCsv', csvContent)
    }
};

window.onkeypress = e => {
    if (e.ctrlKey && e.code == "KeyS") {
        export_xlsx()
    }
}
