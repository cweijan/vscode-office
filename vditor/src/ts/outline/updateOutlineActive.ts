import {getOutlineActiveReferenceY} from "../markdown/outlineRender";
import {hasClosestByHeadings} from "../util/hasClosestByHeadings";

export const OUTLINE_ITEM_ACTIVE_CLASS = "vditor-outline__item--active";

const SCROLL_INTENT_KEYS = new Set([
    "ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " ",
]);

type OutlineActiveState = {
    pinnedId: string | null;
    userScrollIntent: boolean;
};

const outlineActiveState = new WeakMap<IVditor, OutlineActiveState>();

const getState = (vditor: IVditor) => {
    let state = outlineActiveState.get(vditor);
    if (!state) {
        state = {pinnedId: null, userScrollIntent: false};
        outlineActiveState.set(vditor, state);
    }
    return state;
};

const getOutlineContent = (vditor: IVditor) => {
    return vditor.outline.element.querySelector(".vditor-outline__content") as HTMLElement | null;
};

const getOutlineTargetElements = (contentElement: HTMLElement) => {
    const elements: HTMLElement[] = [];
    for (const child of contentElement.children) {
        const item = child as HTMLElement;
        if (hasClosestByHeadings(item)) {
            elements.push(item);
        }
    }
    return elements;
};

const getActiveTargetId = (vditor: IVditor) => {
    const contentElement = vditor[vditor.currentMode].element;
    const targets = getOutlineTargetElements(contentElement);
    if (targets.length === 0) {
        return null;
    }

    const referenceY = getOutlineActiveReferenceY(vditor, contentElement);
    let activeId = targets[0].id;
    for (const target of targets) {
        if (!target.id) {
            continue;
        }
        if (target.getBoundingClientRect().top <= referenceY) {
            activeId = target.id;
        } else {
            break;
        }
    }
    return activeId || null;
};

const scrollOutlineItemIntoView = (outlineContent: HTMLElement, activeSpan: HTMLElement) => {
    const outlineScroller = outlineContent.closest(".vditor-outline__content") as HTMLElement | null;
    if (!outlineScroller) {
        return;
    }
    const scrollerRect = outlineScroller.getBoundingClientRect();
    const itemRect = activeSpan.getBoundingClientRect();
    if (itemRect.top < scrollerRect.top) {
        outlineScroller.scrollTop -= scrollerRect.top - itemRect.top;
    } else if (itemRect.bottom > scrollerRect.bottom) {
        outlineScroller.scrollTop += itemRect.bottom - scrollerRect.bottom;
    }
};

export const setOutlineActiveById = (outlineContent: HTMLElement, targetId: string | null, scrollIntoView = true) => {
    const items = outlineContent.querySelectorAll(`li > span[data-target-id]`);
    let activeSpan: HTMLElement | null = null;
    for (const item of items) {
        const span = item as HTMLElement;
        const isActive = !!targetId && span.getAttribute("data-target-id") === targetId;
        span.classList.toggle(OUTLINE_ITEM_ACTIVE_CLASS, isActive);
        if (isActive) {
            activeSpan = span;
        }
    }
    if (activeSpan && scrollIntoView) {
        scrollOutlineItemIntoView(outlineContent, activeSpan);
    }
};

const applyOutlineActive = (vditor: IVditor, targetId: string | null) => {
    if (vditor.outline.element.style.display === "none") {
        return;
    }
    const outlineContent = getOutlineContent(vditor);
    if (!outlineContent?.firstElementChild) {
        return;
    }
    setOutlineActiveById(outlineContent, targetId);
};

export const pinOutlineActive = (vditor: IVditor, targetId: string) => {
    const state = getState(vditor);
    state.pinnedId = targetId;
    state.userScrollIntent = false;
    applyOutlineActive(vditor, targetId);
};

export const updateOutlineActive = (vditor: IVditor) => {
    const state = getState(vditor);
    if (state.pinnedId) {
        return;
    }
    applyOutlineActive(vditor, getActiveTargetId(vditor));
};

export const refreshOutlineActive = (vditor: IVditor) => {
    const state = getState(vditor);
    if (state.pinnedId) {
        applyOutlineActive(vditor, state.pinnedId);
        return;
    }
    updateOutlineActive(vditor);
};

const markUserScrollIntent = (vditor: IVditor) => {
    getState(vditor).userScrollIntent = true;
};

export const bindOutlineScrollSpy = (vditor: IVditor, onScroll: () => void) => {
    const editorElement = vditor[vditor.currentMode].element;
    let rafId = 0;

    const onUserScrollIntent = () => {
        markUserScrollIntent(vditor);
    };

    const onKeyDown = (event: KeyboardEvent) => {
        if (SCROLL_INTENT_KEYS.has(event.key)) {
            onUserScrollIntent();
        }
    };

    const scrollHandler = () => {
        if (rafId) {
            return;
        }
        rafId = window.requestAnimationFrame(() => {
            rafId = 0;
            const state = getState(vditor);
            if (state.pinnedId) {
                if (!state.userScrollIntent) {
                    return;
                }
                state.pinnedId = null;
                state.userScrollIntent = false;
            }
            onScroll();
        });
    };

    editorElement.addEventListener("scroll", scrollHandler, {passive: true});
    window.addEventListener("scroll", scrollHandler, {passive: true});
    editorElement.addEventListener("wheel", onUserScrollIntent, {passive: true});
    window.addEventListener("wheel", onUserScrollIntent, {passive: true});
    editorElement.addEventListener("touchmove", onUserScrollIntent, {passive: true});
    editorElement.addEventListener("pointerdown", onUserScrollIntent);
    editorElement.addEventListener("keydown", onKeyDown);

    return () => {
        if (rafId) {
            window.cancelAnimationFrame(rafId);
            rafId = 0;
        }
        editorElement.removeEventListener("scroll", scrollHandler);
        window.removeEventListener("scroll", scrollHandler);
        editorElement.removeEventListener("wheel", onUserScrollIntent);
        window.removeEventListener("wheel", onUserScrollIntent);
        editorElement.removeEventListener("touchmove", onUserScrollIntent);
        editorElement.removeEventListener("pointerdown", onUserScrollIntent);
        editorElement.removeEventListener("keydown", onKeyDown);
    };
};
