import { useEffect, useState } from 'react';

function parseRgb(value: string): [number, number, number] | null {
    const color = value.trim();
    if (!color) {
        return null;
    }
    if (color.startsWith('#')) {
        const hex = color.slice(1);
        if (hex.length === 3) {
            const r = parseInt(hex[0] + hex[0], 16);
            const g = parseInt(hex[1] + hex[1], 16);
            const b = parseInt(hex[2] + hex[2], 16);
            return [r, g, b];
        }
        if (hex.length >= 6) {
            const r = parseInt(hex.slice(0, 2), 16);
            const g = parseInt(hex.slice(2, 4), 16);
            const b = parseInt(hex.slice(4, 6), 16);
            return [r, g, b];
        }
        return null;
    }
    const match = color.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
    if (!match) {
        return null;
    }
    return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function luminance(r: number, g: number, b: number): number {
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export function getVscodeThemeColor(name: string, fallback: string): string {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
}

export function isVscodeDarkTheme(): boolean {
    if (document.body.classList.contains('office-dark')) {
        return true;
    }
    const bg = getVscodeThemeColor('--vscode-editor-background', '#ffffff');
    const rgb = parseRgb(bg);
    if (!rgb) {
        return false;
    }
    return luminance(...rgb) < 0.5;
}

export function observeVscodeThemeChange(onChange: () => void): () => void {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
        clearTimeout(timer);
        timer = setTimeout(onChange, 120);
    };
    const headObserver = new MutationObserver(schedule);
    headObserver.observe(document.head, { childList: true, subtree: true, attributes: true });
    const bodyObserver = new MutationObserver(schedule);
    bodyObserver.observe(document.body, { attributes: true, attributeFilter: ['class', 'style'] });
    return () => {
        clearTimeout(timer);
        headObserver.disconnect();
        bodyObserver.disconnect();
    };
}

export function useVscodeSponsorDark(): boolean {
    const [dark, setDark] = useState(isVscodeDarkTheme);
    useEffect(() => observeVscodeThemeChange(() => setDark(isVscodeDarkTheme())), []);
    return dark;
}
