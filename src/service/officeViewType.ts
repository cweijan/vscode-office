import { getFileSuffix } from '@/service/compress/archiveUtils';

export function resolveOfficeViewType(fsPath: string, route?: string): string | undefined {
    if (route) {
        return route;
    }
    const suffix = getFileSuffix(fsPath);
    switch (suffix) {
        case '.pdf':
            return 'pdf';
        case '.htm':
        case '.html':
            return 'html';
        case '.class':
            return 'class';
        default:
            return undefined;
    }
}

export function fileTypeFromPath(fsPath: string): string {
    const suffix = getFileSuffix(fsPath);
    return suffix.startsWith('.') ? suffix.slice(1) : suffix;
}
