/** True when the view is in a split layout (either side-by-side or stacked). */
export function isSplitViewLayout(width: number, height: number): boolean {
    if (width <= 0 || height <= 0) {
        return false;
    }
    const ratio = Math.min(width, height) / Math.max(width, height);
    return ratio < 0.65;
}
