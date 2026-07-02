import ePub, { Book, NavItem, Rendition } from 'epubjs';

export const STORAGE_PREFIX = 'ePubViewer:';

export const THEME_OPTIONS = [
    { label: 'A', value: '#fff;#000', bg: '#fff', fg: '#000' },
    { label: 'A', value: '#000;#fff', bg: '#000', fg: '#fff' },
    { label: 'A', value: '#333;#eee', bg: '#333', fg: '#eee' },
    { label: 'A', value: '#f5deb3;#000', bg: '#f5deb3', fg: '#000' },
    { label: 'A', value: '#111;#f5deb3', bg: '#111', fg: '#f5deb3' },
    { label: 'A', value: '#111b21;#e8e8e8', bg: '#111b21', fg: '#e8e8e8' },
];

export const SYSTEM_FONT = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

export const FONT_OPTIONS = [
    { label: 'System', value: SYSTEM_FONT },
    { label: 'Arial', value: "'Arial', Arimo, Liberation Sans, sans-serif" },
    { label: 'Lato', value: "'Lato', sans-serif" },
    { label: 'Georgia', value: "'Georgia', Liberation Serif, serif" },
    { label: 'Times New Roman', value: "'Times New Roman', Tinos, Liberation Serif, Times, serif" },
    { label: 'Arbutus Slab', value: "'Arbutus Slab', serif" },
];

export const FONT_SIZE_OPTIONS = ['11pt', '12pt', '13pt', '14pt', '15pt', '16pt'];
export const LINE_SPACING_OPTIONS = ['1', '1.2', '1.4', '1.6', '1.8', '2', '2.3', '2.6', '3'];

export interface EpubSettings {
    theme: string;
    font: string;
    fontSize: string;
    lineSpacing: string;
}

export const DEFAULT_SETTINGS: EpubSettings = {
    theme: '#fff;#000',
    font: SYSTEM_FONT,
    fontSize: '13pt',
    lineSpacing: '1.6',
};

const PLACEHOLDER_AUTHORS = new Set(['unknown', 'n/a', 'na', 'none', 'anonymous']);

/** Normalize EPUB creator metadata; omit placeholders and missing values. */
export function resolveEpubAuthor(creator: unknown): string {
    const parts: string[] = [];
    if (typeof creator === 'string') {
        const trimmed = creator.trim();
        if (trimmed) {
            parts.push(trimmed);
        }
    } else if (Array.isArray(creator)) {
        for (const item of creator) {
            if (typeof item === 'string') {
                const trimmed = item.trim();
                if (trimmed) {
                    parts.push(trimmed);
                }
            }
        }
    }
    const text = parts.join(', ');
    if (!text || PLACEHOLDER_AUTHORS.has(text.toLowerCase())) {
        return '';
    }
    return text;
}

export function loadEpubSettings(): EpubSettings {
    const read = (storageKey: string, fallback: string) =>
        localStorage.getItem(`${STORAGE_PREFIX}${storageKey}`) ?? fallback;
    return {
        theme: read('theme', DEFAULT_SETTINGS.theme),
        font: read('font', DEFAULT_SETTINGS.font),
        fontSize: read('font-size', DEFAULT_SETTINGS.fontSize),
        lineSpacing: read('line-spacing', DEFAULT_SETTINGS.lineSpacing),
    };
}

const SETTING_STORAGE_KEYS: Record<keyof EpubSettings, string> = {
    theme: 'theme',
    font: 'font',
    fontSize: 'font-size',
    lineSpacing: 'line-spacing',
};

export function saveEpubSetting(key: keyof EpubSettings, value: string) {
    localStorage.setItem(`${STORAGE_PREFIX}${SETTING_STORAGE_KEYS[key]}`, value);
}

/** Reset reader display settings to defaults (theme, font, etc.). */
export function resetEpubSettings(): EpubSettings {
    const next = { ...DEFAULT_SETTINGS };
    for (const key of Object.keys(SETTING_STORAGE_KEYS) as (keyof EpubSettings)[]) {
        saveEpubSetting(key, next[key]);
    }
    return next;
}

const EPUB_THEME_STYLE_KEY = 'office-viewer-theme';
const boundMetaKeyDocuments = new WeakSet<Document>();

function isCopyShortcut(evt: KeyboardEvent): boolean {
    if (evt.key.toLowerCase() !== 'c') {
        return false;
    }
    return evt.metaKey || evt.ctrlKey;
}

function copyReaderSelection(doc: Document): boolean {
    const text = doc.getSelection()?.toString() ?? '';
    if (!text) {
        return false;
    }
    try {
        if (doc.execCommand('copy')) {
            return true;
        }
    } catch {
        // fall through
    }
    if (navigator.clipboard?.writeText) {
        void navigator.clipboard.writeText(text);
        return true;
    }
    return false;
}

/** Relay metaKey shortcuts to the webview on macOS; handle copy in the reader iframe. */
export function bindReaderMetaKeyRelay(doc: Document) {
    if (!doc || boundMetaKeyDocuments.has(doc)) {
        return;
    }
    boundMetaKeyDocuments.add(doc);
    doc.addEventListener('keydown', (evt: KeyboardEvent) => {
        if (isCopyShortcut(evt)) {
            evt.preventDefault();
            evt.stopPropagation();
            copyReaderSelection(doc);
            return;
        }
        if (evt.metaKey && navigator.userAgent.includes('Mac OS')) {
            const newEvent = new evt.constructor(evt.type, evt) as Event;
            window.parent.document.body.dispatchEvent(newEvent);
        }
    });
}

function themeRulesToCss(rules: ReturnType<typeof buildThemeRules>): string {
    const parts: string[] = [];
    for (const selector of Object.keys(rules)) {
        const props = rules[selector as keyof typeof rules];
        const decl = Object.entries(props).map(([name, value]) => `${name}:${value}`).join(';');
        parts.push(`${selector}{${decl}}`);
    }
    return parts.join('\n');
}

export function buildThemeRules(settings: EpubSettings) {
    const [bg, fg] = settings.theme.split(';');
    const linkColor = '#1e83d2';
    return {
        body: {
            background: bg,
            color: fg,
            'font-family': settings.font ? `${settings.font} !important` : '!invalid-hack',
            'font-size': settings.fontSize ? `${settings.fontSize} !important` : '!invalid-hack',
            'line-height': `${settings.lineSpacing} !important`,
            'text-align': 'justify !important',
        },
        p: {
            'font-family': settings.font ? `${settings.font} !important` : '!invalid-hack',
            'font-size': settings.fontSize ? `${settings.fontSize} !important` : '!invalid-hack',
        },
        a: {
            color: 'inherit !important',
            'text-decoration': 'none !important',
            '-webkit-text-fill-color': 'inherit !important',
        },
        'a:link': {
            color: `${linkColor} !important`,
            'text-decoration': 'none !important',
            '-webkit-text-fill-color': `${linkColor} !important`,
        },
        'a:link:hover': {
            background: 'rgba(0, 0, 0, 0.1) !important',
        },
        img: {
            'max-width': '100% !important',
        },
    };
}

export function applyEpubTheme(rendition: Rendition, settings: EpubSettings, root?: HTMLElement | null) {
    const [bg, fg] = settings.theme.split(';');
    if (root) {
        root.style.background = bg;
        root.style.fontFamily = settings.font;
        root.style.color = fg;
    }
    const css = themeRulesToCss(buildThemeRules(settings));
    for (const content of rendition.getContents()) {
        content.addStylesheetCss(css, EPUB_THEME_STYLE_KEY);
    }
}

export function flattenNavItems(items: NavItem[]): NavItem[] {
    const result: NavItem[] = [];
    for (const item of items) {
        result.push(item);
        if (item.subitems?.length) {
            result.push(...flattenNavItems(item.subitems));
        }
    }
    return result;
}

export function getNavItem(book: Book, loc: { start: { href: string } }, ignoreHash = false) {
    const toc = book.navigation?.toc ?? [];
    const items = flattenNavItems(toc);
    const target = ignoreHash
        ? book.canonical(loc.start.href).split('#')[0]
        : book.canonical(loc.start.href);
    for (const item of items) {
        const href = ignoreHash ? book.canonical(item.href).split('#')[0] : book.canonical(item.href);
        if (href === target) {
            return item;
        }
    }
    return null;
}

function parseNavHref(book: Book, href: string) {
    const canonical = book.canonical(href) || href;
    const hashIdx = canonical.indexOf('#');
    return {
        fragment: hashIdx >= 0 ? canonical.slice(hashIdx + 1) : '',
        path: hashIdx >= 0 ? canonical.slice(0, hashIdx) : canonical,
    };
}

function resolveSpineSection(book: Book, href: string) {
    const { path } = parseNavHref(book, href);
    const candidates = new Set<string>();

    const addCandidate = (value: string) => {
        if (!value) {
            return;
        }
        candidates.add(value);
        const noHash = value.split('#')[0];
        candidates.add(noHash);
        try {
            candidates.add(decodeURIComponent(noHash));
        } catch {
            // ignore malformed URI
        }
        candidates.add(encodeURI(noHash));
        const canonical = book.canonical(value);
        if (canonical) {
            candidates.add(canonical);
            candidates.add(canonical.split('#')[0]);
        }
    };

    addCandidate(href);
    addCandidate(path);

    for (const candidate of candidates) {
        const section = book.spine.get(candidate);
        if (section) {
            return section;
        }
    }

    const pathTail = path.split('/').pop() ?? '';
    if (!pathTail) {
        return null;
    }

    for (const section of book.spine.spineItems) {
        const sectionHref = section.href ?? '';
        if (sectionHref === pathTail || sectionHref.endsWith(`/${pathTail}`)) {
            return section;
        }
    }

    return null;
}

function resolveTocCfi(
    section: NonNullable<ReturnType<Book['spine']['get']>>,
    doc: Document,
    fragment: string,
): string {
    if (fragment) {
        const byId = doc.getElementById(fragment);
        if (byId) {
            return section.cfiFromElement(byId);
        }
        try {
            const bySelector = doc.querySelector(`#${CSS.escape(fragment)}`);
            if (bySelector) {
                return section.cfiFromElement(bySelector);
            }
        } catch {
            // ignore invalid selector
        }
    }

    const body = doc.body;
    if (!body) {
        return section.cfiBase;
    }

    const walker = doc.createTreeWalker(body, NodeFilter.SHOW_ELEMENT);
    let node = walker.nextNode();
    while (node) {
        const el = node as Element;
        const tag = el.tagName.toLowerCase();
        if (tag !== 'script' && tag !== 'style' && (el.textContent?.trim() ?? '').length > 0) {
            return section.cfiFromElement(el);
        }
        node = walker.nextNode();
    }

    return section.cfiFromElement(body);
}

function parseSpinePosFromCfi(cfi: string): number {
    const match = cfi.match(/epubcfi\(\/\d+\/(\d+)/);
    if (!match) {
        return -1;
    }
    return parseInt(match[1], 10);
}

function sectionIndexFromSpinePos(spinePos: number): number {
    return spinePos / 2 - 1;
}

function buildSpineFirstLocationMap(book: Book): Map<number, number> {
    const map = new Map<number, number>();
    const total = book.locations.length();
    for (let i = 0; i < total; i++) {
        const cfi = book.locations.cfiFromLocation(i);
        if (typeof cfi !== 'string') {
            continue;
        }
        const spinePos = parseSpinePosFromCfi(cfi);
        if (spinePos < 0) {
            continue;
        }
        const sectionIndex = sectionIndexFromSpinePos(spinePos);
        if (!map.has(sectionIndex)) {
            map.set(sectionIndex, i);
        }
    }
    return map;
}

function locationFromHref(book: Book, cfi: string): number {
    const location = book.locations.locationFromCfi(cfi);
    if (location >= 0) {
        return location;
    }

    const total = book.locations.length();
    if (total <= 0) {
        return -1;
    }

    const pct = book.locations.percentageFromCfi(cfi);
    if (pct == null) {
        return -1;
    }

    return Math.round(pct * Math.max(0, total - 1));
}

/** Resolve a TOC href to the location index used by the bottom progress bar. */
export async function buildTocPageMap(book: Book, items: NavItem[]): Promise<Record<string, number>> {
    const map: Record<string, number> = {};
    if (!book.locations.length()) {
        return map;
    }

    const flat = flattenNavItems(items);
    const spineLocationMap = buildSpineFirstLocationMap(book);

    for (const item of flat) {
        if (!item.href) {
            continue;
        }

        const section = resolveSpineSection(book, item.href);
        if (!section) {
            continue;
        }

        const chapterLocation = spineLocationMap.get(section.index);
        if (chapterLocation != null) {
            map[item.href] = chapterLocation;
        }
    }

    const bySection = new Map<number, {
        section: NonNullable<ReturnType<Book['spine']['get']>>;
        items: Array<{ href: string; fragment: string }>;
    }>();

    for (const item of flat) {
        if (!item.href) {
            continue;
        }
        const { fragment } = parseNavHref(book, item.href);
        if (!fragment) {
            continue;
        }

        const section = resolveSpineSection(book, item.href);
        if (!section) {
            continue;
        }

        let group = bySection.get(section.index);
        if (!group) {
            group = { section, items: [] };
            bySection.set(section.index, group);
        }
        group.items.push({ href: item.href, fragment });
    }

    for (const group of bySection.values()) {
        try {
            await group.section.load(book.load.bind(book));
            const doc = group.section.document;
            if (!doc) {
                continue;
            }

            for (const { href, fragment } of group.items) {
                const cfi = resolveTocCfi(group.section, doc, fragment);
                const location = locationFromHref(book, cfi);
                if (location >= 0) {
                    map[href] = location;
                }
            }
        } finally {
            group.section.unload();
        }
    }

    return map;
}

export interface SearchHit {
    cfi: string;
    excerpt: string;
}

export async function searchEpubBook(book: Book, query: string, limit = 200): Promise<SearchHit[]> {
    const hits: SearchHit[] = [];
    for (const item of book.spine.spineItems) {
        await item.load(book.load.bind(book));
        const results = item.find(query);
        item.unload();
        for (const result of results) {
            hits.push({ cfi: result.cfi, excerpt: result.excerpt });
            if (hits.length >= limit) {
                return hits;
            }
        }
    }
    return hits;
}

export async function loadEpubBook(buffer: ArrayBuffer) {
    const book = ePub(buffer, { encoding: 'binary' });
    await book.ready;
    return book;
}

export async function ensureLocations(book: Book, chars = 1650) {
    const key = `${book.key()}:locations-${chars}`;
    const stored = localStorage.getItem(key);
    if (stored) {
        book.locations.load(stored);
        return;
    }
    await book.locations.generate(chars);
    localStorage.setItem(key, book.locations.save());
}
