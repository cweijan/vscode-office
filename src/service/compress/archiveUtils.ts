import { basename, extname, parse } from 'path';

export function getFileSuffix(fsPath: string): string {
    const lower = fsPath.toLowerCase();
    if (lower.endsWith('.tar.gz') || lower.endsWith('.tgz')) return '.tar.gz';
    return extname(lower);
}

export function getArchiveBaseName(fsPath: string): string {
    const lower = fsPath.toLowerCase();
    const name = basename(fsPath);
    if (lower.endsWith('.tar.gz')) return name.slice(0, -7);
    if (lower.endsWith('.tgz')) return name.slice(0, -4);
    return parse(fsPath).name;
}
