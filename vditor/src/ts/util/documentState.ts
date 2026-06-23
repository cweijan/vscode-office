import {accessLocalStorage} from "./compatibility";

const LEGACY_FOCUS_KEY_PATTERN = /^md-.+-focus$/;
const LEGACY_SCROLL_KEY_PATTERN = /^scrollTop_/;

let legacyDocumentStatePurged = false;

type ScrollSession = {
    scrollTop: number;
    scrollSaveTimer: number;
    restoring: boolean;
    scrollBound: boolean;
};

const scrollSessions = new WeakMap<IVditor, ScrollSession>();

const createScrollSession = (): ScrollSession => ({
    scrollTop: 0,
    scrollSaveTimer: 0,
    restoring: false,
    scrollBound: false,
});

const getScrollSession = (vditor: IVditor): ScrollSession => {
    let session = scrollSessions.get(vditor);
    if (!session) {
        session = createScrollSession();
        scrollSessions.set(vditor, session);
    }
    return session;
};

export const buildDocumentCacheId = (scheme: string, uri: string): string => {
    return `${scheme}:${uri}`;
};

export const getFocusStateKey = (cacheId: string): string => `${cacheId}-focus`;

export const getScrollStateKey = (cacheId: string): string => `${cacheId}-scroll`;

export const purgeLegacyDocumentStateKeys = () => {
    if (legacyDocumentStatePurged || !accessLocalStorage()) {
        return;
    }
    legacyDocumentStatePurged = true;
    for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (!key) {
            continue;
        }
        if (LEGACY_FOCUS_KEY_PATTERN.test(key) || LEGACY_SCROLL_KEY_PATTERN.test(key)) {
            localStorage.removeItem(key);
        }
    }
};

const getDocumentCacheId = (vditor: IVditor): string | undefined => {
    return vditor.options.cache?.id;
};

const getEditorElement = (vditor: IVditor): HTMLElement | null => {
    const mode = vditor.currentMode;
    if (mode === "ir" || mode === "wysiwyg") {
        return vditor[mode].element;
    }
    return null;
};

const getImageTopInEditor = (editorEl: HTMLElement, img: HTMLImageElement): number => {
    const editorRect = editorEl.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();
    return imgRect.top - editorRect.top + editorEl.scrollTop;
};

const getImagesHeightAbove = (editorEl: HTMLElement, scrollTop: number): number => {
    let height = 0;
    const images = editorEl.querySelectorAll("img");
    for (let i = 0; i < images.length; i++) {
        const img = images[i] as HTMLImageElement;
        const imgHeight = img.getBoundingClientRect().height;
        if (imgHeight <= 0) {
            continue;
        }
        if (getImageTopInEditor(editorEl, img) < scrollTop) {
            height += imgHeight;
        }
    }
    return height;
};

const normalizeScrollTop = (editorEl: HTMLElement, scrollTop: number): number => {
    return Math.max(0, scrollTop - getImagesHeightAbove(editorEl, scrollTop));
};

const denormalizeScrollTop = (editorEl: HTMLElement, normalizedScrollTop: number): number => {
    return normalizedScrollTop + getImagesHeightAbove(editorEl, normalizedScrollTop);
};

export const saveDocumentScroll = (vditor: IVditor, scrollTop: number) => {
    const cacheId = getDocumentCacheId(vditor);
    if (!cacheId || !accessLocalStorage() || Number.isNaN(scrollTop)) {
        return;
    }
    try {
        localStorage.setItem(getScrollStateKey(cacheId), String(scrollTop));
    } catch {
        // ignore
    }
};

export const clearDocumentScroll = (cacheId: string) => {
    if (!accessLocalStorage()) {
        return;
    }
    localStorage.removeItem(getScrollStateKey(cacheId));
};

const readStoredDocumentScroll = (vditor: IVditor): number => {
    const cacheId = getDocumentCacheId(vditor);
    if (!cacheId || !accessLocalStorage()) {
        return 0;
    }
    try {
        const raw = localStorage.getItem(getScrollStateKey(cacheId));
        const scrollTop = Number(raw);
        return Number.isNaN(scrollTop) ? 0 : scrollTop;
    } catch {
        return 0;
    }
};

const persistScroll = (vditor: IVditor) => {
    const editorEl = getEditorElement(vditor);
    if (!editorEl) {
        return;
    }
    const session = getScrollSession(vditor);
    const normalizedScrollTop = normalizeScrollTop(editorEl, editorEl.scrollTop);
    session.scrollTop = normalizedScrollTop;
    window.clearTimeout(session.scrollSaveTimer);
    saveDocumentScroll(vditor, normalizedScrollTop);
};

const schedulePersistScroll = (vditor: IVditor) => {
    const session = getScrollSession(vditor);
    window.clearTimeout(session.scrollSaveTimer);
    session.scrollSaveTimer = window.setTimeout(() => {
        persistScroll(vditor);
    }, 200);
};

const applyEditorScroll = (vditor: IVditor, top: number): boolean => {
    const editorEl = getEditorElement(vditor);
    if (!editorEl || Number.isNaN(top)) {
        return false;
    }
    const session = getScrollSession(vditor);
    session.restoring = true;
    editorEl.scrollTop = top;
    session.scrollTop = top;
    window.requestAnimationFrame(() => {
        session.restoring = false;
    });
    return true;
};

const onEditorScroll = (vditor: IVditor, event: Event) => {
    const session = getScrollSession(vditor);
    if (session.restoring) {
        return;
    }
    const editorEl = event.currentTarget as HTMLElement;
    const activeEl = getEditorElement(vditor);
    if (editorEl !== activeEl) {
        return;
    }
    session.scrollTop = editorEl.scrollTop;
    schedulePersistScroll(vditor);
};

const bindEditorScrollListeners = (vditor: IVditor) => {
    const session = getScrollSession(vditor);
    if (session.scrollBound) {
        return;
    }
    const selectors = [".vditor-wysiwyg .vditor-reset", ".vditor-ir .vditor-reset"];
    for (let i = 0; i < selectors.length; i++) {
        const editorEl = vditor.element.querySelector(selectors[i]) as HTMLElement | null;
        if (editorEl) {
            editorEl.addEventListener("scroll", (event) => {
                onEditorScroll(vditor, event);
            }, {passive: true});
        }
    }
    session.scrollBound = true;
};

export const bindDocumentScrollPersistence = (vditor: IVditor) => {
    bindEditorScrollListeners(vditor);

    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            persistScroll(vditor);
        }
    });

    window.addEventListener("blur", () => {
        persistScroll(vditor);
    });
};

export const restoreDocumentScroll = (vditor: IVditor, scrollTop?: number) => {
    const editorEl = getEditorElement(vditor);
    if (!editorEl) {
        return;
    }
    const normalized = scrollTop != null ? Number(scrollTop) : readStoredDocumentScroll(vditor);
    if (Number.isNaN(normalized)) {
        return;
    }
    applyEditorScroll(vditor, denormalizeScrollTop(editorEl, normalized));
};
