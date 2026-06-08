const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');
const XLSX = require('xlsx');
const { rows, cols, outputDir } = require('./excel_perf_config');

function ensureOutputDir() {
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
}

function buildSheetData(rowCount, colCount) {
    const data = new Array(rowCount);
    for (let ri = 0; ri < rowCount; ri += 1) {
        const row = new Array(colCount);
        for (let ci = 0; ci < colCount; ci += 1) {
            row[ci] = `R${ri}C${ci}`;
        }
        data[ri] = row;
    }
    return data;
}

function formatMs(ms) {
    return `${ms.toFixed(2)} ms`;
}

function formatSize(bytes) {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function main() {
    ensureOutputDir();

    const outPath = path.join(outputDir, `xlsx_${rows}x${cols}.xlsx`);
    const data = buildSheetData(rows, cols);

    console.log('=== SheetJS (xlsx) performance test ===');
    console.log(`Rows: ${rows}, Cols: ${cols}, Cells: ${rows * cols}`);
    console.log(`Output: ${outPath}`);

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

    const writeStart = performance.now();
    XLSX.writeFile(wb, outPath);
    const writeMs = performance.now() - writeStart;

    const fileSize = fs.statSync(outPath).size;

    const readStart = performance.now();
    const readWb = XLSX.readFile(outPath);
    const readMs = performance.now() - readStart;

    const sheetName = readWb.SheetNames[0];
    const readRows = XLSX.utils.sheet_to_json(readWb.Sheets[sheetName], { header: 1 });
    const readCellCount = readRows.reduce((sum, row) => sum + row.length, 0);

    console.log(`Write: ${formatMs(writeMs)}`);
    console.log(`Read:  ${formatMs(readMs)}`);
    console.log(`File size: ${formatSize(fileSize)}`);
    console.log(`Read rows: ${readRows.length}, cells: ${readCellCount}`);
}

main();
