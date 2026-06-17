export interface PopupAnchor {
    x: number;
    y: number;
    /** Toolbar / repo settings: place below cursor when near top of view */
    repoToolbar?: boolean;
}

export const COMMIT_DETAIL_POPUP_WIDTH = 400;

export function computeAnchoredDialogPosition(
    anchor: PopupAnchor,
    width: number,
    height: number,
): { left: number; top: number } {
    const rawTop = anchor.repoToolbar && anchor.y < 120 ? anchor.y + 8 : anchor.y - 90;
    const top = Math.max(Math.min(rawTop, window.innerHeight - height - 10), 10);
    // Match legacy git-graph: only clamp minimum left edge
    const left = Math.max(anchor.x - 50, 10);
    return { left, top };
}

export function computeCommitDetailPopupPosition(
    anchor: PopupAnchor,
    popupHeight: number,
    popupWidth = COMMIT_DETAIL_POPUP_WIDTH,
): { left: number; top: number } {
    const left = Math.min(window.innerWidth - popupWidth, anchor.x + 100);
    const top = Math.max(
        Math.min(window.innerHeight - popupHeight - 10, Math.max(0, anchor.y - 80)),
        0,
    );
    return { left, top };
}

export function anchorFromMouseEvent(
    event: { clientX: number; clientY: number },
    repoToolbar = false,
): PopupAnchor {
    return { x: event.clientX, y: event.clientY, repoToolbar };
}

export function anchorFromElement(element: Element): PopupAnchor {
    const rect = element.getBoundingClientRect();
    return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
    };
}
