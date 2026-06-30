import {
    parquetMetadataAsync,
    parquetReadObjects,
    parquetSchema,
    type AsyncBuffer,
    type FileMetaData,
    type SchemaElement,
    type SchemaTree,
} from 'hyparquet';
import { getPhysicalColumns } from 'hyparquet/src/schema.js';
import { parquetWriteBuffer, type BasicType, type ColumnSource } from 'hyparquet-writer';

export interface ParquetColumnInfo {
    name: string;
    type: string;
}

export interface ParquetFileInfo {
    file: AsyncBuffer;
    metadata: FileMetaData;
    columns: ParquetColumnInfo[];
    rowCount: number;
    createdBy?: string;
}

const PAGE_SIZE = 50;

export function getPageSize(): number {
    return PAGE_SIZE;
}

function asyncBufferFromArrayBuffer(buffer: ArrayBuffer): AsyncBuffer {
    return {
        byteLength: buffer.byteLength,
        slice(start: number, end?: number) {
            return buffer.slice(start, end ?? buffer.byteLength);
        },
    };
}

function formatSchemaType(element: SchemaElement): string {
    if (element.logical_type?.type) {
        return element.logical_type.type;
    }
    if (element.converted_type) {
        return element.converted_type;
    }
    return element.type ?? 'UNKNOWN';
}

function findLeafElement(tree: SchemaTree, pathParts: string[]): SchemaElement | null {
    if (pathParts.length == 0) {
        return tree.element.type ? tree.element : null;
    }
    const [head, ...rest] = pathParts;
    for (const child of tree.children) {
        if (child.element.name == head) {
            return findLeafElement(child, rest);
        }
    }
    return null;
}

export async function openParquetFile(buffer: ArrayBuffer): Promise<ParquetFileInfo> {
    const file = asyncBufferFromArrayBuffer(buffer);
    const metadata = await parquetMetadataAsync(file);
    const schemaTree = parquetSchema(metadata);
    const columnNames = getPhysicalColumns(schemaTree);
    const columns: ParquetColumnInfo[] = [];
    for (const name of columnNames) {
        const element = findLeafElement(schemaTree, name.split('.'));
        columns.push({
            name,
            type: element ? formatSchemaType(element) : 'UNKNOWN',
        });
    }
    return {
        file,
        metadata,
        columns,
        rowCount: Number(metadata.num_rows),
        createdBy: metadata.created_by,
    };
}

export async function readAllParquetRows(file: AsyncBuffer, metadata: FileMetaData): Promise<Record<string, unknown>[]> {
    const rowCount = Number(metadata.num_rows);
    if (rowCount <= 0) {
        return [];
    }
    return parquetReadObjects({
        file,
        metadata,
        rowStart: 0,
        rowEnd: rowCount,
        rowFormat: 'object',
    });
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

export function writeParquetBuffer(columns: ParquetColumnInfo[], rows: Record<string, unknown>[]): ArrayBuffer {
    const columnData: ColumnSource[] = [];
    for (const column of columns) {
        const values = rows.map(row => row[column.name]);
        const type = inferColumnType(values);
        const data = values.map(value => normalizeParquetValue(value, type));
        columnData.push({
            name: column.name,
            data,
            type,
            nullable: true,
        });
    }
    return parquetWriteBuffer({ columnData });
}

export function isColumnEditable(type: string): boolean {
    const upper = `${type}`.toUpperCase();
    if (upper.includes('STRUCT') || upper.includes('MAP') || upper.includes('LIST')) {
        return false;
    }
    return true;
}

export function parseCellInput(text: string, type: string): unknown {
    const trimmed = text.trim();
    if (!trimmed) return null;
    const upper = `${type}`.toUpperCase();
    if (upper.includes('BOOL')) {
        if (/^(true|1|yes)$/i.test(trimmed)) return true;
        if (/^(false|0|no)$/i.test(trimmed)) return false;
        return trimmed;
    }
    if (upper.includes('INT') || upper.includes('FLOAT') || upper.includes('DOUBLE') || upper.includes('DECIMAL') || upper.includes('NUM')) {
        const number = Number(trimmed);
        if (isNaN(number)) return trimmed;
        if (upper.includes('INT') && !upper.includes('INTERVAL')) return Math.trunc(number);
        return number;
    }
    if (upper.includes('JSON') || trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
            return JSON.parse(trimmed);
        } catch {
            return trimmed;
        }
    }
    return trimmed;
}

export function formatCellValue(value: unknown): string {
    if (value == null) {
        return '';
    }
    if (typeof value === 'bigint') {
        return value.toString();
    }
    if (value instanceof Date) {
        return value.toISOString();
    }
    if (typeof value === 'object') {
        return JSON.stringify(value);
    }
    return String(value);
}
