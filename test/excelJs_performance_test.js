const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');
const ExcelJS = require('exceljs');
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

async function main() {
    ensureOutputDir();

    const outPath = path.join(outputDir, `exceljs_${rows}x${cols}.xlsx`);
    const data = buildSheetData(rows, cols);

    console.log('=== ExcelJS performance test ===');
    console.log(`Rows: ${rows}, Cols: ${cols}, Cells: ${rows * cols}`);
    console.log(`Output: ${outPath}`);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Sheet1');

    const writeStart = performance.now();
    for (let ri = 0; ri < data.length; ri += 1) {
        sheet.addRow(data[ri]);
    }
    await workbook.xlsx.writeFile(outPath);
    const writeMs = performance.now() - writeStart;

    const fileSize = fs.statSync(outPath).size;

    const readStart = performance.now();
    const readWorkbook = new ExcelJS.Workbook();
    await readWorkbook.xlsx.readFile(outPath);
    const readMs = performance.now() - readStart;

    const readSheet = readWorkbook.getWorksheet('Sheet1');
    let readRowCount = 0;
    let readCellCount = 0;
    readSheet.eachRow({ includeEmpty: false }, (row) => {
        readRowCount += 1;
        readCellCount += row.cellCount;
    });

    console.log(`Write: ${formatMs(writeMs)}`);
    console.log(`Read:  ${formatMs(readMs)}`);
    console.log(`File size: ${formatSize(fileSize)}`);
    console.log(`Read rows: ${readRowCount}, cells: ${readCellCount}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
