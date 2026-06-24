export function pathToFileURL(path: string) {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return { href: `file://${normalized}` };
}

export function fileURLToPath(url: string | { href: string }) {
    const href = typeof url === 'string' ? url : url.href;
    return href.replace(/^file:\/\//, '');
}

export default { pathToFileURL, fileURLToPath };
