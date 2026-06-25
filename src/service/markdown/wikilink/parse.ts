import { WIKI_URI_PREFIX } from './constants';

export interface WikiLinkTarget {
    page: string;
    fragment: string;
}

export function parseWikiLinkUri(uri: string): WikiLinkTarget | null {
    if (!uri.startsWith(WIKI_URI_PREFIX)) {
        return null;
    }
    const raw = uri.slice(WIKI_URI_PREFIX.length);
    const hashIndex = raw.indexOf('#');
    if (hashIndex < 0) {
        return { page: raw, fragment: '' };
    }
    return {
        page: raw.slice(0, hashIndex),
        fragment: raw.slice(hashIndex + 1),
    };
}

export function normalizePage(page: string): string {
    return page.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '');
}
