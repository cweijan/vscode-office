/** True when the view is in a split layout. */
export function isSplitViewLayout(height: number, viewColumn?: number): boolean {
    if (height > 0 && height < 500) {
        return true;
    }
    return viewColumn !== undefined && viewColumn >= 2;
}
