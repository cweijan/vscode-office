import {
    parquetMetadataAsync,
    parquetReadObjects,
    parquetSchema,
    type AsyncBuffer,
    type FileMetaData,
    type LogicalType,
    type SchemaElement,
} from 'hyparquet';
import { compressors } from 'hyparquet-compressors';

export const DEFAULT_PARQUET_PAGE_SIZE = 10000;
export const PARQUET_PAGE_SIZE_OPTIONS = [1000, 10000, 50000] as const;

interface ParquetCellData {
    text: string;
    style?: number;
}

interface ParquetRowData {
    cells: Record<number, ParquetCellData>;
    height?: number;
}

interface ParquetRowsData {
    len: number;
    [key: number]: ParquetRowData;
}

interface ParquetColsData {
    len: number;
    [key: number]: { width: number };
}

export interface ParquetSheetData {
    name: string;
    rows: ParquetRowsData;
    cols: ParquetColsData;
    styles: Array<{
        bgcolor?: string;
        color?: string;
        font?: {
            bold?: boolean;
            name?: string;
            size?: number;
        };
    }>;
}

export interface ParquetPageOptions {
    pageIndex: number;
    pageSize: number;
    metadata?: FileMetaData;
}

export interface ParquetPageResult {
    pageIndex: number;
    pageSize: number;
    totalRows: number;
    totalPages: number;
    columns: string[];
    columnTypes: ParquetColumnType[];
    sheet: ParquetSheetData;
    schemaSheet: ParquetSheetData;
}

export interface ParquetColumnType {
    name: string;
    type: string;
    nullable: boolean;
    physicalType: string;
    logicalType: string;
    convertedType: string;
    repetitionType: string;
}

const HEADER_STYLE_INDEX = 0;
const HEADER_ROW_HEIGHT = 30;
const MIN_COL_WIDTH = 70;
const MAX_COL_WIDTH = 320;
const DEFAULT_COL_WIDTH = 110;
const CHAR_WIDTH = 8;
const MAX_ROWS_TO_CHECK = 12;

export async function readParquetMetadata(file: AsyncBuffer): Promise<FileMetaData> {
    return parquetMetadataAsync(file);
}

function normalizePageSize(pageSize: number): number {
    if (!Number.isFinite(pageSize) || pageSize <= 0) {
        return DEFAULT_PARQUET_PAGE_SIZE;
    }
    return Math.floor(pageSize);
}

function clampPageIndex(pageIndex: number, totalPages: number): number {
    if (!Number.isFinite(pageIndex)) return 0;
    return Math.min(Math.max(0, Math.floor(pageIndex)), Math.max(0, totalPages - 1));
}

function getColumnSchema(metadata: FileMetaData): SchemaElement[] {
    return parquetSchema(metadata).children.map(child => child.element);
}

function formatLogicalType(logicalType?: LogicalType): string | undefined {
    if (!logicalType) return undefined;
    switch (logicalType.type) {
        case 'DECIMAL':
            return `DECIMAL(${logicalType.precision},${logicalType.scale})`;
        case 'TIME':
            return `TIME(${logicalType.unit}${logicalType.isAdjustedToUTC ? ',UTC' : ''})`;
        case 'TIMESTAMP':
            return `TIMESTAMP(${logicalType.unit}${logicalType.isAdjustedToUTC ? ',UTC' : ''})`;
        case 'INTEGER':
            return `${logicalType.isSigned ? 'INT' : 'UINT'}_${logicalType.bitWidth}`;
        case 'GEOMETRY':
        case 'GEOGRAPHY':
            return logicalType.crs ? `${logicalType.type}(${logicalType.crs})` : logicalType.type;
        default:
            return logicalType.type;
    }
}

function getPhysicalType(element: SchemaElement): string {
    return element.type_length
        ? `${element.type ?? 'GROUP'}(${element.type_length})`
        : element.type ?? 'GROUP';
}

function getRepetitionType(element: SchemaElement): string {
    if (element.repetition_type === 'REQUIRED') return 'required';
    if (element.repetition_type === 'REPEATED') return 'repeated';
    return 'nullable';
}

function formatColumnType(element: SchemaElement): string {
    const physicalType = getPhysicalType(element);
    const parts = [physicalType];
    if (element.converted_type) {
        parts.push(element.converted_type);
    }
    const logicalType = formatLogicalType(element.logical_type);
    if (logicalType && logicalType !== element.converted_type) {
        parts.push(logicalType);
    }
    const repetitionType = getRepetitionType(element);
    return `${parts.join(' / ')} ${repetitionType}`;
}

function getColumnTypes(schema: SchemaElement[]): ParquetColumnType[] {
    return schema.map(element => ({
        name: element.name,
        type: formatColumnType(element),
        nullable: element.repetition_type !== 'REQUIRED',
        physicalType: getPhysicalType(element),
        logicalType: formatLogicalType(element.logical_type) ?? '',
        convertedType: element.converted_type ?? '',
        repetitionType: getRepetitionType(element),
    }));
}

function formatValue(value: unknown): string {
    if (value == null) return '';
    if (typeof value === 'bigint') return value.toString();
    if (value instanceof Date) return value.toISOString();
    if (value instanceof Uint8Array) return `[binary ${value.byteLength} bytes]`;
    if (Array.isArray(value) || typeof value === 'object') {
        try {
            return JSON.stringify(value, (_key, item) => {
                if (typeof item === 'bigint') return item.toString();
                if (item instanceof Uint8Array) return `[binary ${item.byteLength} bytes]`;
                return item;
            });
        } catch {
            return String(value);
        }
    }
    return String(value);
}

function clampColWidth(width: number): number {
    return Math.min(Math.max(width, MIN_COL_WIDTH), MAX_COL_WIDTH);
}

function calculateColWidth(
    columns: string[],
    rows: Record<string, unknown>[],
    columnIndex: number,
): number {
    const column = columns[columnIndex];
    let maxLength = column.length;
    for (let i = 0; i < Math.min(rows.length, MAX_ROWS_TO_CHECK); i += 1) {
        const length = formatValue(rows[i]?.[column]).length;
        if (length > maxLength) {
            maxLength = length;
        }
    }
    return clampColWidth(Math.max(DEFAULT_COL_WIDTH, maxLength * CHAR_WIDTH));
}

function calculateSchemaColWidth(rows: string[][], columnIndex: number): number {
    let maxLength = 0;
    for (const row of rows) {
        maxLength = Math.max(maxLength, row[columnIndex]?.length ?? 0);
    }
    return clampColWidth(Math.max(DEFAULT_COL_WIDTH, maxLength * CHAR_WIDTH));
}

function buildDataSheet(columns: string[], rows: Record<string, unknown>[]): ParquetSheetData {
    const sheetRows: ParquetRowsData = {
        len: rows.length + 1,
        0: {
            height: HEADER_ROW_HEIGHT,
            cells: columns.reduce<Record<number, ParquetCellData>>((cells, column, index) => {
                cells[index] = { text: column, style: HEADER_STYLE_INDEX };
                return cells;
            }, {}),
        },
    };

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
        const row = rows[rowIndex];
        const cells: Record<number, ParquetCellData> = {};
        for (let colIndex = 0; colIndex < columns.length; colIndex += 1) {
            cells[colIndex] = { text: formatValue(row?.[columns[colIndex]]) };
        }
        sheetRows[rowIndex + 1] = { cells };
    }

    const cols: ParquetColsData = { len: columns.length };
    for (let colIndex = 0; colIndex < columns.length; colIndex += 1) {
        cols[colIndex] = { width: calculateColWidth(columns, rows, colIndex) };
    }

    return {
        name: 'Data',
        rows: sheetRows,
        cols,
        styles: [{ bgcolor: '#f2f3f5', font: { bold: true } }],
    };
}

function buildSchemaSheet(columnTypes: ParquetColumnType[]): ParquetSheetData {
    const headers = ['Column', 'Type', 'Nullable', 'Physical Type', 'Logical Type', 'Converted Type', 'Repetition'];
    const rows = [
        headers,
        ...columnTypes.map(columnType => [
            columnType.name,
            columnType.type,
            columnType.nullable ? 'true' : 'false',
            columnType.physicalType,
            columnType.logicalType,
            columnType.convertedType,
            columnType.repetitionType,
        ]),
    ];
    const sheetRows: ParquetRowsData = {
        len: rows.length,
        0: {
            height: HEADER_ROW_HEIGHT,
            cells: headers.reduce<Record<number, ParquetCellData>>((cells, header, index) => {
                cells[index] = { text: header, style: HEADER_STYLE_INDEX };
                return cells;
            }, {}),
        },
    };

    for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
        sheetRows[rowIndex] = {
            cells: rows[rowIndex].reduce<Record<number, ParquetCellData>>((cells, value, index) => {
                cells[index] = { text: value };
                return cells;
            }, {}),
        };
    }

    const cols: ParquetColsData = { len: headers.length };
    for (let colIndex = 0; colIndex < headers.length; colIndex += 1) {
        cols[colIndex] = { width: calculateSchemaColWidth(rows, colIndex) };
    }

    return {
        name: 'Schema',
        rows: sheetRows,
        cols,
        styles: [{ bgcolor: '#f2f3f5', font: { bold: true } }],
    };
}

export async function readParquetPage(file: AsyncBuffer, options: ParquetPageOptions): Promise<ParquetPageResult> {
    const metadata = options.metadata ?? await readParquetMetadata(file);
    const pageSize = normalizePageSize(options.pageSize);
    const totalRows = Number(metadata.num_rows);
    const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
    const pageIndex = clampPageIndex(options.pageIndex, totalPages);
    const rowStart = Math.min(pageIndex * pageSize, totalRows);
    const rowEnd = Math.min(rowStart + pageSize, totalRows);
    const schema = getColumnSchema(metadata);
    const columns = schema.map(element => element.name);
    const columnTypes = getColumnTypes(schema);
    const rows = rowEnd > rowStart
        ? await parquetReadObjects({
            file,
            metadata,
            rowStart,
            rowEnd,
            rowFormat: 'object',
            compressors,
            useOffsetIndex: true,
        }) as Record<string, unknown>[]
        : [];

    return {
        pageIndex,
        pageSize,
        totalRows,
        totalPages,
        columns,
        columnTypes,
        sheet: buildDataSheet(columns, rows),
        schemaSheet: buildSchemaSheet(columnTypes),
    };
}
