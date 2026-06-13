export function getExcelThemeColor(name: string, fallback: string): string {
    const root = document.querySelector('.excel-viewer') ?? document.documentElement;
    const value = getComputedStyle(root).getPropertyValue(name).trim();
    return value || fallback;
}

export function resolveExcelCellBg(bgcolor?: string): string {
    if (!bgcolor || bgcolor === '#ffffff' || bgcolor === '#fff') {
        return getExcelThemeColor('--excel-cell-bg', '#ffffff');
    }
    return bgcolor;
}

export function resolveExcelCellColor(color?: string): string {
    if (!color || color === '#0a0a0a' || color === '#000000' || color === '#000') {
        return getExcelThemeColor('--excel-fg', '#cccccc');
    }
    return color;
}
