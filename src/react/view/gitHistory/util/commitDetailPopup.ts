export interface PopupAnchor {
    x: number;
    y: number;
}

export const COMMIT_DETAIL_POPUP_WIDTH = 400;

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

export function anchorFromElement(element: Element): PopupAnchor {
    const rect = element.getBoundingClientRect();
    return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
    };
}
