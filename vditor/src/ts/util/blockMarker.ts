const BLOCK_MARKER_HANDLE_SIZE = 20;
const BLOCK_MARKER_MAX_TOP = 6;

export const getBlockMarkerTop = (block: HTMLElement) => {
    const lineHeight = parseFloat(getComputedStyle(block).lineHeight) || 24;
    return Math.max(0, Math.min(lineHeight / 2 - BLOCK_MARKER_HANDLE_SIZE / 2, BLOCK_MARKER_MAX_TOP));
};

export const syncBlockMarkerTop = (block: HTMLElement) => {
    block.style.setProperty("--vditor-block-marker-top", `${getBlockMarkerTop(block)}px`);
};

export const clearBlockMarkerTop = (block: HTMLElement) => {
    block.style.removeProperty("--vditor-block-marker-top");
};
