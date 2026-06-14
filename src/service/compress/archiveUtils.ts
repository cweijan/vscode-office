import { basename, extname, parse } from 'path';

export type CompressArchiveType = 'zip' | 'rar' | 'tar.gz' | 'tar';

export function getCompressArchiveType(fsPath: string): CompressArchiveType | null {
    const lower = fsPath.toLowerCase();
    if (lower.endsWith('.tar.gz') || lower.endsWith('.tgz')) return 'tar.gz';
    if (lower.endsWith('.tar')) return 'tar';
    const ext = extname(lower);
    switch (ext) {
        case '.zip':
        case '.jar':
        case '.apk':
        case '.vsix':
            return 'zip';
        case '.rar':
            return 'rar';
        default:
            return null;
    }
}

export function getArchiveBaseName(fsPath: string): string {
    const lower = fsPath.toLowerCase();
    const name = basename(fsPath);
    if (lower.endsWith('.tar.gz')) return name.slice(0, -7);
    if (lower.endsWith('.tgz')) return name.slice(0, -4);
    return parse(fsPath).name;
}
