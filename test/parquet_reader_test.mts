import assert from 'node:assert/strict';
import { parquetWriteBuffer } from 'hyparquet-writer';
import {
    readParquetMetadata,
    readParquetPage,
    type ParquetPageResult,
} from '../src/provider/parquet/parquetReader';

function asyncBufferFromArrayBuffer(buffer: ArrayBuffer) {
    return {
        byteLength: buffer.byteLength,
        slice(start: number, end?: number) {
            return buffer.slice(start, end);
        },
    };
}

function cellText(page: ParquetPageResult, row: number, col: number): string {
    return page.sheet.rows[row].cells[col].text;
}

function schemaCellText(page: ParquetPageResult, row: number, col: number): string {
    return page.schemaSheet.rows[row].cells[col].text;
}

const rowCount = 12;
const created = Array.from({ length: rowCount }, (_, index) => new Date(Date.UTC(2026, 0, index + 1, 12, 30)));
const buffer = parquetWriteBuffer({
    rowGroupSize: 5,
    columnData: [
        { name: 'name', data: Array.from({ length: rowCount }, (_, index) => `name-${index}`), type: 'STRING' },
        { name: 'count', data: Array.from({ length: rowCount }, (_, index) => index), type: 'INT32' },
        { name: 'enabled', data: Array.from({ length: rowCount }, (_, index) => index % 2 === 0), type: 'BOOLEAN' },
        { name: 'created', data: created, type: 'TIMESTAMP' },
        { name: 'big_id', data: Array.from({ length: rowCount }, (_, index) => 9007199254740993n + BigInt(index)), type: 'INT64' },
        { name: 'notes', data: Array.from({ length: rowCount }, (_, index) => index === 3 ? null : `note-${index}`), type: 'STRING' },
    ],
});

async function main() {
    const file = asyncBufferFromArrayBuffer(buffer);
    const metadata = await readParquetMetadata(file);

    assert.equal(Number(metadata.num_rows), rowCount);

    const first = await readParquetPage(file, { pageIndex: 0, pageSize: 5, metadata });
    assert.deepEqual(first.columns, ['name', 'count', 'enabled', 'created', 'big_id', 'notes']);
    assert.deepEqual(first.columnTypes, [
        {
            name: 'name',
            type: 'BYTE_ARRAY / UTF8 nullable',
            nullable: true,
            physicalType: 'BYTE_ARRAY',
            logicalType: '',
            convertedType: 'UTF8',
            repetitionType: 'nullable',
        },
        {
            name: 'count',
            type: 'INT32 nullable',
            nullable: true,
            physicalType: 'INT32',
            logicalType: '',
            convertedType: '',
            repetitionType: 'nullable',
        },
        {
            name: 'enabled',
            type: 'BOOLEAN nullable',
            nullable: true,
            physicalType: 'BOOLEAN',
            logicalType: '',
            convertedType: '',
            repetitionType: 'nullable',
        },
        {
            name: 'created',
            type: 'INT64 / TIMESTAMP_MILLIS nullable',
            nullable: true,
            physicalType: 'INT64',
            logicalType: '',
            convertedType: 'TIMESTAMP_MILLIS',
            repetitionType: 'nullable',
        },
        {
            name: 'big_id',
            type: 'INT64 nullable',
            nullable: true,
            physicalType: 'INT64',
            logicalType: '',
            convertedType: '',
            repetitionType: 'nullable',
        },
        {
            name: 'notes',
            type: 'BYTE_ARRAY / UTF8 nullable',
            nullable: true,
            physicalType: 'BYTE_ARRAY',
            logicalType: '',
            convertedType: 'UTF8',
            repetitionType: 'nullable',
        },
    ]);
    assert.equal(first.totalRows, rowCount);
    assert.equal(first.totalPages, 3);
    assert.equal(first.pageIndex, 0);
    assert.equal(first.sheet.name, 'Data');
    assert.equal(first.schemaSheet.name, 'Schema');
    assert.equal(first.sheet.rows.len, 6);
    assert.equal(first.schemaSheet.rows.len, 7);
    assert.equal(cellText(first, 0, 0), 'name');
    assert.equal(cellText(first, 0, 5), 'notes');
    assert.equal(cellText(first, 1, 0), 'name-0');
    assert.equal(cellText(first, 1, 1), '0');
    assert.equal(cellText(first, 1, 2), 'true');
    assert.equal(cellText(first, 1, 3), created[0].toISOString());
    assert.equal(cellText(first, 1, 4), '9007199254740993');
    assert.equal(cellText(first, 4, 5), '');
    assert.equal(schemaCellText(first, 0, 0), 'Column');
    assert.equal(schemaCellText(first, 0, 1), 'Type');
    assert.equal(schemaCellText(first, 0, 2), 'Nullable');
    assert.equal(schemaCellText(first, 1, 0), 'name');
    assert.equal(schemaCellText(first, 1, 1), 'BYTE_ARRAY / UTF8 nullable');
    assert.equal(schemaCellText(first, 1, 2), 'true');
    assert.equal(schemaCellText(first, 1, 3), 'BYTE_ARRAY');
    assert.equal(schemaCellText(first, 1, 5), 'UTF8');
    assert.equal(schemaCellText(first, 4, 0), 'created');
    assert.equal(schemaCellText(first, 4, 1), 'INT64 / TIMESTAMP_MILLIS nullable');
    assert.equal(schemaCellText(first, 4, 5), 'TIMESTAMP_MILLIS');

    const second = await readParquetPage(file, { pageIndex: 1, pageSize: 5, metadata });
    assert.equal(second.pageIndex, 1);
    assert.equal(second.sheet.rows.len, 6);
    assert.equal(second.schemaSheet.rows.len, 7);
    assert.equal(cellText(second, 1, 1), '5');
    assert.equal(cellText(second, 5, 1), '9');
    assert.notEqual(cellText(second, 1, 1), '4');
    assert.notEqual(cellText(second, 5, 1), '10');

    const last = await readParquetPage(file, { pageIndex: 2, pageSize: 5, metadata });
    assert.equal(last.pageIndex, 2);
    assert.equal(last.sheet.rows.len, 3);
    assert.equal(last.schemaSheet.rows.len, 7);
    assert.equal(cellText(last, 1, 0), 'name-10');
    assert.equal(cellText(last, 2, 0), 'name-11');

    console.log('Parquet reader tests passed');
}

void main();
