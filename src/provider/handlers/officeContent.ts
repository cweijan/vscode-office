import { basename, extname } from 'path';
import { Uri, workspace, type Webview } from 'vscode';
import { Handler } from '@/common/handler';
import { isUriReadOnly } from '@/common/fileReadOnly';

export function isVirtualUri(uri: Uri): boolean {
    return uri.scheme !== 'file';
}

/** 与 markdown documentCacheId 一致，用于 webview localStorage 键前缀 */
export function buildDocumentCacheId(uri: Uri): string {
    return `${uri.scheme}:${uri.toString()}`;
}

export async function readUriBytes(uri: Uri): Promise<Uint8Array> {
    return workspace.fs.readFile(uri);
}

export async function readUriText(uri: Uri): Promise<string> {
    const data = await readUriBytes(uri);
    return new TextDecoder('utf-8').decode(data);
}

export function bytesToPayloadBuffer(data: Uint8Array): number[] {
    const buffer: number[] = new Array(data.length);
    for (let i = 0; i < data.length; i++) {
        buffer[i] = data[i];
    }
    return buffer;
}

export async function emitVirtualOfficeOpen(handler: Handler, uri: Uri): Promise<void> {
    const now = Date.now();
    const ext = extname(uri.fsPath);
    const readOnly = await isUriReadOnly(uri);
    try {
        const data = await readUriBytes(uri);
        const payload: Record<string, unknown> = {
            ext,
            path: uri.fsPath,
            fileName: basename(uri.fsPath),
            scheme: uri.scheme,
            documentCacheId: buildDocumentCacheId(uri),
            readOnly,
            nonce: now,
        };
        payload.buffer = bytesToPayloadBuffer(data);
        handler.emit('open', payload);
    } catch (error) {
        handler.emit('open', {
            ext,
            path: uri.fsPath,
            fileName: basename(uri.fsPath),
            scheme: uri.scheme,
            documentCacheId: buildDocumentCacheId(uri),
            readOnly,
            error: error instanceof Error ? error.message : 'Failed to read file',
            nonce: now,
        });
    }
}

export async function emitFileOfficeOpen(handler: Handler, uri: Uri, webview: Webview): Promise<void> {
    const now = Date.now();
    const readOnly = await isUriReadOnly(uri);
    handler.emit('open', {
        ext: extname(uri.fsPath),
        path: webview.asWebviewUri(uri).with({ query: `nonce=${now.toString()}` }).toString(),
        fileName: basename(uri.fsPath),
        documentCacheId: buildDocumentCacheId(uri),
        readOnly,
    });
}
