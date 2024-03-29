import { Handler } from '@/common/handler';
import { readdirSync } from 'fs';
import { basename, resolve } from 'path';
import * as vscode from 'vscode';

function loadImages(uri: vscode.Uri, webview: vscode.Webview) {

    if (uri.scheme != 'file') {
        const href = webview.asWebviewUri(uri);
        return {
            images: [{
                src: href.toString(),
                title: basename(uri.fsPath)
            }],
            current: 0
        }
    }
    const folderPath = vscode.Uri.file(resolve(uri.fsPath, ".."));
    const files = readdirSync(folderPath.fsPath)
    let current = 0;
    const currentFile = basename(uri.fsPath)
    const images = files.filter(file => isImage(file)).map((file, i) => {
        if (currentFile == file) current = i;
        const resUri = vscode.Uri.file(`${folderPath.fsPath}/${file}`);
        const resource = webview.asWebviewUri(resUri).with({ query: `nonce=${Date.now().toString()}` }).toString();
        return {
            src: resource,
            title: basename(uri.fsPath)
        }
    })
    return { images, current };
}

export function isImage(fileName: string) {
    return /\.(jpg|png|svg|gif|apng|bmp|ico|cur|jpeg|pjpeg|pjp|tif|webp)$/i.test(fileName);
}

export function handleImage(handler: Handler, uri: vscode.Uri, webview: vscode.Webview) {
    const sendImageList = () => {
        const images = loadImages(uri, webview)
        handler.emit("images", images)
    }
    handler.on('images', () => sendImageList())
    handler.on('fileChange', () => sendImageList())
}