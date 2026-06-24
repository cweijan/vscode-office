const normalize = (parts: string[]) => parts.filter(Boolean).join('/').replace(/\/+/g, '/');

export const sep = '/';
export const posix = { sep: '/' as const };

export function basename(path: string, ext?: string) {
    const name = normalize(path.split(/[/\\]/)).split('/').pop() ?? '';
    if (ext && name.endsWith(ext)) {
        return name.slice(0, -ext.length);
    }
    return name;
}

export function extname(path: string) {
    const base = basename(path);
    const dot = base.lastIndexOf('.');
    return dot >= 0 ? base.slice(dot) : '';
}

export function dirname(path: string) {
    const parts = normalize(path.split(/[/\\]/)).split('/');
    parts.pop();
    return parts.join('/') || '.';
}

export function join(...segments: string[]) {
    return normalize(segments.flatMap((segment) => segment.split(/[/\\]/)));
}

export function resolve(...segments: string[]) {
    const resolved = segments.flatMap((segment) => segment.split(/[/\\]/));
    const absolute = segments[0]?.startsWith('/');
    const stack: string[] = [];
    for (const part of resolved) {
        if (!part || part === '.') {
            continue;
        }
        if (part === '..') {
            stack.pop();
            continue;
        }
        stack.push(part);
    }
    const result = stack.join('/');
    return absolute ? `/${result}` : result || '.';
}

export function isAbsolute(path: string) {
    return path.startsWith('/') || /^[A-Za-z]:[\\/]/.test(path);
}

export function parse(path: string) {
    const base = basename(path);
    const dot = base.lastIndexOf('.');
    const ext = dot >= 0 ? base.slice(dot) : '';
    const name = dot >= 0 ? base.slice(0, dot) : base;
    return {
        root: '',
        dir: dirname(path),
        base,
        ext,
        name,
    };
}

export function relative(from: string, to: string) {
    const fromParts = normalize(from.split(/[/\\]/)).split('/').filter(Boolean);
    const toParts = normalize(to.split(/[/\\]/)).split('/').filter(Boolean);
    while (fromParts.length && toParts.length && fromParts[0] === toParts[0]) {
        fromParts.shift();
        toParts.shift();
    }
    return [...fromParts.map(() => '..'), ...toParts].join('/') || '.';
}

export default {
    sep,
    posix,
    basename,
    dirname,
    join,
    resolve,
    isAbsolute,
    parse,
    relative,
    extname,
};
