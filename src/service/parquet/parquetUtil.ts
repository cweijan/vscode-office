import { parquetMetadataAsync, parquetReadObjects, type AsyncBuffer } from 'hyparquet';
import { parquetWriteBuffer, type BasicType, type ColumnSource } from 'hyparquet-writer';
import { readFileSync } from 'fs';

export interface ParquetFieldInfo {
    name: string;
}

function asyncBufferFromBuffer(buffer: Buffer): AsyncBuffer {
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    return {
        byteLength: buffer.byteLength,
        slice(start: number, end?: number) {
            return arrayBuffer.slice(start, end ?? buffer.byteLength);
        },
    };
}

function formatCellValue(value: unknown): unknown {
    if (value == null) return null;
    if (typeof value === 'object' && !(value instanceof Date)) {
        return JSON.stringify(value);
    }
    return value;
}

function inferColumnType(values: unknown[]): BasicType {
    let hasFloat = false;
    let hasBigInt = false;
    let hasDate = false;
    let hasBoolean = false;
    let hasNumber = false;
    let nonNullCount = 0;

    for (const value of values) {
        if (value == null) continue;
        nonNullCount++;
        if (typeof value === 'boolean') {
            hasBoolean = true;
            continue;
        }
        if (typeof value === 'bigint') {
            hasBigInt = true;
            continue;
        }
        if (value instanceof Date) {
            hasDate = true;
            continue;
        }
        if (typeof value === 'number') {
            hasNumber = true;
            if (!Number.isInteger(value)) hasFloat = true;
            continue;
        }
        return 'STRING';
    }

    if (nonNullCount == 0) return 'STRING';
    if (hasBoolean && !hasNumber && !hasBigInt && !hasDate) return 'BOOLEAN';
    if (hasDate && !hasNumber && !hasBigInt && !hasBoolean) return 'TIMESTAMP';
    if (hasBigInt && !hasFloat && !hasDate && !hasBoolean) return 'INT64';
    if (hasNumber && !hasFloat && !hasBigInt && !hasDate && !hasBoolean) return 'INT32';
    if (hasNumber && !hasBigInt && !hasDate && !hasBoolean) return 'DOUBLE';
    return 'STRING';
}

function normalizeParquetValue(value: unknown, type: BasicType): unknown {
    if (value == null) return null;
    if (type == 'STRING' || type == 'JSON') {
        if (typeof value === 'object') {
            if (value instanceof Date) return value.toISOString();
            if (value instanceof Buffer) return value.toString('base64');
            return JSON.stringify(value);
        }
        return String(value);
    }
    if (type == 'BOOLEAN') return Boolean(value);
    if (type == 'TIMESTAMP') {
        if (value instanceof Date) return value;
        const date = new Date(value as string | number);
        return isNaN(date.getTime()) ? null : date;
    }
    if (type == 'INT64') {
        if (typeof value === 'bigint') return value;
        return BigInt(Math.trunc(Number(value)));
    }
    if (type == 'INT32' || type == 'FLOAT' || type == 'DOUBLE') {
        const number = Number(value);
        return isNaN(number) ? null : number;
    }
    return String(value);
}

export function rowsToParquetBuffer(fields: ParquetFieldInfo[], rows: Record<string, unknown>[]): Buffer {
    const columnData: ColumnSource[] = [];
    for (let i = 0; i < fields.length; i++) {
        const field = fields[i];
        const values = rows.map(row => formatCellValue(row[field.name] ?? row[i]));
        const type = inferColumnType(values);
        const data = values.map(value => normalizeParquetValue(value, type));
        columnData.push({
            name: field.name,
            data,
            type,
            nullable: true,
        });
    }
    return Buffer.from(parquetWriteBuffer({ columnData }));
}

export async function readParquetRows(filePath: string): Promise<Record<string, unknown>[]> {
    const buffer = readFileSync(filePath);
    const file = asyncBufferFromBuffer(buffer);
    const metadata = await parquetMetadataAsync(file);
    const rowCount = Number(metadata.num_rows);
    if (rowCount == 0) return [];
    return parquetReadObjects({
        file,
        metadata,
        rowStart: 0,
        rowEnd: rowCount,
        rowFormat: 'object',
    });
}
