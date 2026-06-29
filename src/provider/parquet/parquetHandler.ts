import { createReadStream } from 'fs';
import { basename, extname } from 'path';
import * as vscode from 'vscode';
import type { AsyncBuffer, FileMetaData } from 'hyparquet';
import { Handler } from '@/common/handler';
import { isWebExtensionHost } from '@/common/extensionHost';
import { isUriReadOnly } from '@/common/fileReadOnly';
import { buildDocumentCacheId, readUriBytes } from '@/provider/handlers/officeContent';
import { TelemetryService } from '@/service/telemetryService';
import {
    DEFAULT_PARQUET_PAGE_SIZE,
    readParquetMetadata,
    readParquetPage,
} from './parquetReader';

interface ParquetSource {
    file: AsyncBuffer;
    metadata?: FileMetaData;
}

interface ParquetLoadPageRequest {
    requestId?: number;
    pageIndex?: number;
    pageSize?: number;
}

function arrayBufferFromBytes(bytes: Uint8Array): ArrayBuffer {
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function asyncBufferFromBytes(bytes: Uint8Array): AsyncBuffer {
    const buffer = arrayBufferFromBytes(bytes);
    return {
        byteLength: buffer.byteLength,
        slice(start: number, end?: number) {
            return buffer.slice(start, end);
        },
    };
}

async function asyncBufferFromFile(uri: vscode.Uri): Promise<AsyncBuffer> {
    const stat = await vscode.workspace.fs.stat(uri);
    return {
        byteLength: stat.size,
        slice(start: number, end?: number) {
            const exclusiveEnd = end ?? stat.size;
            if (exclusiveEnd <= start) {
                return new ArrayBuffer(0);
            }
            return new Promise<ArrayBuffer>((resolve, reject) => {
                const reader = createReadStream(uri.fsPath, { start, end: exclusiveEnd - 1 });
                const chunks: Buffer[] = [];
                reader.on('data', (chunk: Buffer) => chunks.push(chunk));
                reader.on('error', reject);
                reader.on('end', () => resolve(arrayBufferFromBytes(Buffer.concat(chunks))));
            });
        },
    };
}

async function createParquetSource(uri: vscode.Uri): Promise<ParquetSource> {
    if (uri.scheme === 'file' && !isWebExtensionHost()) {
        return { file: await asyncBufferFromFile(uri) };
    }
    const bytes = await readUriBytes(uri);
    return { file: asyncBufferFromBytes(bytes) };
}

async function loadParquetPage(source: ParquetSource, pageIndex: number, pageSize: number) {
    source.metadata ??= await readParquetMetadata(source.file);
    return readParquetPage(source.file, { pageIndex, pageSize, metadata: source.metadata });
}

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

export function handleParquetEvent(uri: vscode.Uri, handler: Handler) {
    let sourcePromise: Promise<ParquetSource> | undefined;

    const getSource = () => {
        sourcePromise ??= createParquetSource(uri);
        return sourcePromise;
    };

    const sendOpen = async () => {
        sourcePromise = undefined;
        handler.emit('open', {
            ext: extname(uri.fsPath),
            path: uri.fsPath,
            fileName: basename(uri.fsPath),
            documentCacheId: buildDocumentCacheId(uri),
            readOnly: true,
            parquet: true,
            sourceReadOnly: await isUriReadOnly(uri),
            pageSize: DEFAULT_PARQUET_PAGE_SIZE,
        });
    };

    handler
        .on('init', () => { void sendOpen(); })
        .on('fileChange', () => { void sendOpen(); })
        .on('parquetLoadPage', async (payload: ParquetLoadPageRequest = {}) => {
            try {
                const source = await getSource();
                const result = await loadParquetPage(
                    source,
                    payload.pageIndex ?? 0,
                    payload.pageSize ?? DEFAULT_PARQUET_PAGE_SIZE,
                );
                handler.emit('parquetPageLoaded', {
                    requestId: payload.requestId,
                    ...result,
                });
            } catch (error) {
                handler.emit('parquetLoadError', {
                    requestId: payload.requestId,
                    message: errorMessage(error),
                });
            }
        })
        .on('developerTool', () => vscode.commands.executeCommand('workbench.action.toggleDevTools'))
        .on('sponsorClick', (payload: { action: 'logo' | 'site'; component?: string; placement?: string; variant?: string }) => {
            TelemetryService.get()?.trackPreviewSponsorClick(payload.action, payload);
        })
        .on('openSponsor', () => {
            vscode.commands.executeCommand(
                'workbench.extensions.action.showExtensionsWithIds',
                ['cweijan.vscode-database-client2'],
            );
        })
        .on('openExternal', (url: string) => {
            if (url) {
                vscode.env.openExternal(vscode.Uri.parse(url));
            }
        })
        .on('dispose', () => {
            sourcePromise = undefined;
        });
}
