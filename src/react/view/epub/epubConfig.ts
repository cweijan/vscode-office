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
