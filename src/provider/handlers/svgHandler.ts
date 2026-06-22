import { Handler } from '@/common/handler';
import { shouldSkipFileChange } from '@/provider/compress/commonHandler';
import { readUriText } from '@/provider/handlers/officeContent';
import { extname } from 'path';
import { type Uri } from 'vscode';

export function handleSvg(handler: Handler, uri: Uri) {
    const send = async () => {
        if (shouldSkipFileChange(uri)) {
            return;
        }
        const now = Date.now();
        try {
            const content = await readUriText(uri);
            handler.emit('open', {
                ext: extname(uri.fsPath),
                path: uri.fsPath,
                scheme: uri.scheme,
                content,
                nonce: now,
            });
        } catch (error) {
            handler.emit('open', {
                ext: extname(uri.fsPath),
                path: uri.fsPath,
                scheme: uri.scheme,
                content: '',
                error: error instanceof Error ? error.message : 'Failed to read SVG',
                nonce: now,
            });
        }
    };
    handler.on('init', send).on('fileChange', send);
}
