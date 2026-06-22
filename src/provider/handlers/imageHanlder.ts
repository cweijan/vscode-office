import { Handler } from '@/common/handler';
import { readdirSync } from 'fs';
import { basename, extname, resolve } from 'path';
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

function loadFolderImages(uri: vscode.Uri, webview: vscode.Webview) {
    const folderPath = vscode.Uri.file(resolve(uri.fsPath, ".."));
    const files = readdirSync(folderPath.fsPath);
    let current = 0;
    const currentFile = basename(uri.fsPath);
    const images = files.filter(file => isImage(file)).map((file, i) => {
        if (currentFile == file) current = i;
        const resUri = vscode.Uri.file(`${folderPath.fsPath}/${file}`);
        const resource = webview.asWebviewUri(resUri).with({ query: `nonce=${Date.now().toString()}` }).toString();
        return {
            src: resource,
            title: file,
        };
    });
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
                : loadFolderImages(uri, webview);
            handler.emit("images", images);
        } catch (error) {
            handler.emit("images", {
                images: [],
                current: 0,
                error: error instanceof Error ? error.message : 'Failed to read image',
            });
        }
    };
    handler.on('images', () => { void sendImageList(); });
    handler.on('fileChange', () => { void sendImageList(); });
}
