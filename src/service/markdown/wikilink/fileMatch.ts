import { basename, extname } from 'path';
import * as vscode from 'vscode';
import { MARKDOWN_EXTENSIONS } from './constants';
import { normalizePage } from './parse';

export function matchesWikiPage(fullPath: string, page: string): boolean {
    const posix = fullPath.replace(/\\/g, '/').toLowerCase();
    const target = normalizePage(page).toLowerCase();

    if (target.includes('/')) {
        for (const ext of MARKDOWN_EXTENSIONS) {
            if (posix.endsWith(`/${target}${ext}`)) {
                return true;
            }
        }
        return posix.endsWith(`/${target}`);
    }

    const fileBase = basename(posix, extname(posix));
    return fileBase === target;
}

/** 多个命中时取路径最短（最接近笔记库根） */
export function pickBestPath(paths: string[], page: string): string | null {
    let best: string | null = null;
    let bestLength = Number.MAX_SAFE_INTEGER;

    for (const fullPath of paths) {
        if (!matchesWikiPage(fullPath, page)) {
            continue;
        }
        if (fullPath.length < bestLength) {
            best = fullPath;
            bestLength = fullPath.length;
        }
    }

    return best;
}

/** 多个命中时取路径最短（最接近笔记库根），保留原始 URI scheme（Remote SSH 等） */
export function pickBestUri(uris: vscode.Uri[], page: string): vscode.Uri | null {
    let best: vscode.Uri | null = null;
    let bestLength = Number.MAX_SAFE_INTEGER;

    for (const uri of uris) {
        const fullPath = uri.fsPath;
        if (!matchesWikiPage(fullPath, page)) {
            continue;
        }
        if (fullPath.length < bestLength) {
            best = uri;
            bestLength = fullPath.length;
        }
    }

    return best;
}
