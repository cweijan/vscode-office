import { extname } from 'path';
import { MARKDOWN_EXTENSIONS } from './constants';
import { normalizePage } from './parse';

/** 在指定目录下直接查找用的相对文件名 */
export function directFileNames(page: string): string[] {
    const base = normalizePage(page);
    const ext = extname(base).toLowerCase();
    if (ext && MARKDOWN_EXTENSIONS.includes(ext as typeof MARKDOWN_EXTENSIONS[number])) {
        return [base];
    }
    const names: string[] = [];
    for (const suffix of MARKDOWN_EXTENSIONS) {
        names.push(`${base}${suffix}`);
    }
    return names;
}

/** 在工作区内递归查找用的 glob 模式（仅 ** 前缀，交给 findFiles） */
export function recursiveFindPatterns(page: string): string[] {
    const base = normalizePage(page);
    const ext = extname(base).toLowerCase();
    if (ext && MARKDOWN_EXTENSIONS.includes(ext as typeof MARKDOWN_EXTENSIONS[number])) {
        return [`**/${base}`];
    }
    const patterns: string[] = [];
    for (const suffix of MARKDOWN_EXTENSIONS) {
        patterns.push(`**/${base}${suffix}`);
    }
    return patterns;
}
