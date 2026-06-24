export interface PopupAnchor {
    x: number;
    y: number;
    /** Toolbar / repo settings: place below cursor when near top of view */
    repoToolbar?: boolean;
    /** Center dialog horizontally on the anchor instead of biasing left */
    centerHorizontally?: boolean;
}

export interface ViewportBounds {
    width: number;
    height: number;
}

export const COMMIT_DETAIL_POPUP_WIDTH = 400;
const POPUP_MARGIN = 10;
const MAX_COMMIT_DETAIL_HEIGHT = 600;

export function getViewportBounds(container?: HTMLElement | null): ViewportBounds {
    if (container) {
        const rect = container.getBoundingClientRect();
        return {
            width: Math.max(0, rect.width),
            height: Math.max(0, rect.height),
        };
    }
    return {
        width: document.documentElement.clientWidth,
        height: document.documentElement.clientHeight,
    };
}

export interface CommitDetailPopupLayout {
    left: number;
    top: number;
    maxHeight: number;
    height: number;
}

export function computeAnchoredDialogPosition(
    anchor: PopupAnchor,
    width: number,
    height: number,
    bounds?: ViewportBounds,
): { left: number; top: number } {
    const viewport = bounds ?? getViewportBounds();
    const rawTop = anchor.repoToolbar && anchor.y < 120 ? anchor.y + 8 : anchor.y - 90;
    const maxTop = Math.max(POPUP_MARGIN, viewport.height - height - POPUP_MARGIN);
    const top = Math.min(Math.max(rawTop, POPUP_MARGIN), maxTop);
    const maxLeft = Math.max(POPUP_MARGIN, viewport.width - width - POPUP_MARGIN);
    const preferredLeft = anchor.x - width / 2;
    const left = Math.min(Math.max(preferredLeft, POPUP_MARGIN), maxLeft);
    return { left, top };
}

export function computeCommitDetailPopupPosition(
    anchor: PopupAnchor,
    popupHeight: number,
    popupWidth = COMMIT_DETAIL_POPUP_WIDTH,
    bounds?: ViewportBounds,
): CommitDetailPopupLayout {
    const viewport = bounds ?? getViewportBounds();
    const viewportMaxHeight = Math.max(160, viewport.height - POPUP_MARGIN * 2);
    const effectiveHeight = Math.min(popupHeight, viewportMaxHeight, MAX_COMMIT_DETAIL_HEIGHT);

    const preferredTop = Math.max(POPUP_MARGIN, anchor.y - 80);
    const maxTop = Math.max(POPUP_MARGIN, viewport.height - effectiveHeight - POPUP_MARGIN);
    const top = Math.min(preferredTop, maxTop);

    const preferredRight = anchor.x + 100 + COMMIT_DETAIL_POPUP_WIDTH;
    const preferredLeft = preferredRight - popupWidth;
    const maxLeft = Math.max(POPUP_MARGIN, viewport.width - popupWidth - POPUP_MARGIN);
    const left = Math.min(Math.max(POPUP_MARGIN, preferredLeft), maxLeft);

    const maxHeight = Math.min(
        MAX_COMMIT_DETAIL_HEIGHT,
        Math.max(160, viewport.height - top - POPUP_MARGIN),
    );

    return { left, top, maxHeight, height: effectiveHeight };
}

export function anchorFromMouseEvent(
    event: { clientX: number; clientY: number },
    repoToolbar = false,
    centerHorizontally = false,
): PopupAnchor {
    return { x: event.clientX, y: event.clientY, repoToolbar, centerHorizontally };
}

export function anchorFromElement(element: Element): PopupAnchor {
    const rect = element.getBoundingClientRect();
    return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
    };
}
