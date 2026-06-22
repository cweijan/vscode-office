import { extname } from 'path';
import { Uri, workspace, type Webview } from 'vscode';
import { Handler } from '@/common/handler';

export function isVirtualUri(uri: Uri): boolean {
    return uri.scheme !== 'file';
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

function bytesToBase64(data: Uint8Array): string {
    return Buffer.from(data).toString('base64');
}

export async function emitVirtualOfficeOpen(handler: Handler, uri: Uri): Promise<void> {
    const now = Date.now();
    const ext = extname(uri.fsPath);
    try {
        const data = await readUriBytes(uri);
        const payload: Record<string, unknown> = {
            ext,
            path: uri.fsPath,
            scheme: uri.scheme,
            nonce: now,
        };
        if (ext.toLowerCase() === '.pdf') {
            payload.bufferBase64 = bytesToBase64(data);
        } else {
            payload.buffer = bytesToPayloadBuffer(data);
        }
        handler.emit('open', payload);
    } catch (error) {
        handler.emit('open', {
            ext,
            path: uri.fsPath,
            scheme: uri.scheme,
            error: error instanceof Error ? error.message : 'Failed to read file',
            nonce: now,
        });
    }
}

export function emitFileOfficeOpen(handler: Handler, uri: Uri, webview: Webview): void {
    const now = Date.now();
    handler.emit('open', {
        ext: extname(uri.fsPath),
        path: webview.asWebviewUri(uri).with({ query: `nonce=${now.toString()}` }).toString(),
    });
}
