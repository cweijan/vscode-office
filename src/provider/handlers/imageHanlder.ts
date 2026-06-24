import { Handler } from '@/common/handler';
import { basename, extname } from 'path';
import * as vscode from 'vscode';
import { isVirtualUri, readUriBytes } from '@/provider/handlers/officeContent';

const IMAGE_MIME: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.pjpeg': 'image/jpeg',
    '.pjp': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.apng': 'image/apng',
    '.bmp': 'image/bmp',
    '.ico': 'image/x-icon',
    '.cur': 'image/x-icon',
    '.tif': 'image/tiff',
    '.tiff': 'image/tiff',
    '.heic': 'image/heic',
    '.heif': 'image/heif',
    '.webp': 'image/webp',
};

function getImageMime(filePath: string): string {
    const ext = extname(filePath).toLowerCase();
    return IMAGE_MIME[ext] ?? 'application/octet-stream';
}

async function loadVirtualImage(uri: vscode.Uri): Promise<{ images: { src: string; title: string; ext: string }[]; current: number }> {
    const data = await readUriBytes(uri);
    const ext = extname(uri.fsPath).toLowerCase();
    const mime = getImageMime(uri.fsPath);
    const base64 = Buffer.from(data).toString('base64');
    return {
        images: [{
            src: `data:${mime};base64,${base64}`,
            title: basename(uri.fsPath),
            ext,
        }],
        current: 0,
    };
}

async function loadFolderImages(uri: vscode.Uri, webview: vscode.Webview) {
    const folderPath = vscode.Uri.joinPath(uri, '..');
    const entries = await vscode.workspace.fs.readDirectory(folderPath);
    let current = 0;
    const currentFile = basename(uri.fsPath);
    const images: { src: string; title: string }[] = [];
    let index = 0;
    for (const [name, fileType] of entries) {
        if (fileType !== vscode.FileType.File || !isImage(name)) {
            continue;
        }
        if (currentFile === name) {
            current = index;
        }
        const resUri = vscode.Uri.joinPath(folderPath, name);
        const resource = webview.asWebviewUri(resUri).with({ query: `nonce=${Date.now().toString()}` }).toString();
        images.push({ src: resource, title: name });
        index++;
    }
    return { images, current };
}

export function isImage(fileName: string) {
    return /\.(jpg|png|gif|apng|bmp|ico|cur|jpeg|pjpeg|pjp|tif|tiff|heic|heif|webp)$/i.test(fileName);
}

export function handleImage(handler: Handler, uri: vscode.Uri, webview: vscode.Webview) {
    const sendImageList = async () => {
        try {
            const images = isVirtualUri(uri)
                ? await loadVirtualImage(uri)
                : await loadFolderImages(uri, webview);
            handler.emit('images', images);
        } catch (error) {
            handler.emit('images', {
                images: [],
                current: 0,
                error: error instanceof Error ? error.message : 'Failed to read image',
            });
        }
    };
    handler.on('images', () => { void sendImageList(); });
    handler.on('fileChange', () => { void sendImageList(); });
    handler.on('slideTitle', (title: string) => {
        handler.panel.title = title;
    });
}
