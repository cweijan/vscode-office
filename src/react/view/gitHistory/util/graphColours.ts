const MIN_GRAPH_CONTRAST = 2.3;
const LIGHT_BG_TARGET_LIGHTNESS = 0.48;
const LIGHT_BG_MIN_LIGHTNESS = 0.38;
const LIGHT_BG_MAX_LIGHTNESS = 0.54;
const LIGHT_BG_MIN_SATURATION = 0.62;

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function parseRgb(color: string): [number, number, number] | null {
    const value = color.trim();
    if (!value) {
        return null;
    }
    if (value.startsWith('#')) {
        const hex = value.slice(1);
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
    const match = value.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
    if (!match) {
        return null;
    }
    return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function rgbToHex(r: number, g: number, b: number): string {
    const toHex = (channel: number) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const lightness = (max + min) / 2;
    let hue = 0;
    let saturation = 0;

    if (max !== min) {
        const delta = max - min;
        saturation = lightness > 0.5
            ? delta / (2 - max - min)
            : delta / (max + min);
        if (max === rn) {
            hue = ((gn - bn) / delta + (gn < bn ? 6 : 0)) / 6;
        } else if (max === gn) {
            hue = ((bn - rn) / delta + 2) / 6;
        } else {
            hue = ((rn - gn) / delta + 4) / 6;
        }
    }

    return [hue * 360, saturation, lightness];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
    if (s === 0) {
        const gray = l * 255;
        return [gray, gray, gray];
    }

    const hue = ((h % 360) + 360) % 360 / 360;
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const hueToRgb = (t: number) => {
        let channel = t;
        if (channel < 0) channel += 1;
        if (channel > 1) channel -= 1;
        if (channel < 1 / 6) return p + (q - p) * 6 * channel;
        if (channel < 1 / 2) return q;
        if (channel < 2 / 3) return p + (q - p) * (2 / 3 - channel) * 6;
        return p;
    };

    return [
        hueToRgb(hue + 1 / 3) * 255,
        hueToRgb(hue) * 255,
        hueToRgb(hue - 1 / 3) * 255,
    ];
}

function relativeLuminance(r: number, g: number, b: number): number {
    const [rs, gs, bs] = [r, g, b].map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.03928
            ? normalized / 12.92
            : Math.pow((normalized + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(foreground: [number, number, number], background: [number, number, number]): number {
    const fgLum = relativeLuminance(...foreground);
    const bgLum = relativeLuminance(...background);
    const lighter = Math.max(fgLum, bgLum);
    const darker = Math.min(fgLum, bgLum);
    return (lighter + 0.05) / (darker + 0.05);
}

function isLightBackground(background: string): boolean {
    const rgb = parseRgb(background);
    if (!rgb) {
        return true;
    }
    return relativeLuminance(...rgb) > 0.5;
}

const LIGHT_BG_LIGHTNESS_BLEND = 0.55;

/** Boost saturation and normalize lightness so every branch colour reads well on light backgrounds. */
export function adjustColourForLightBackground(colour: string, background: string): string {
    const source = parseRgb(colour);
    const bg = parseRgb(background);
    if (!source || !bg || !isLightBackground(background)) {
        return colour;
    }

    let [hue, saturation, lightness] = rgbToHsl(...source);
    saturation = clamp(Math.max(saturation * 1.15, LIGHT_BG_MIN_SATURATION), 0, 0.98);

    lightness = lightness * (1 - LIGHT_BG_LIGHTNESS_BLEND)
        + LIGHT_BG_TARGET_LIGHTNESS * LIGHT_BG_LIGHTNESS_BLEND;
    lightness = clamp(lightness, LIGHT_BG_MIN_LIGHTNESS, LIGHT_BG_MAX_LIGHTNESS);

    let rgb = hslToRgb(hue, saturation, lightness);
    let ratio = getContrastRatio(rgb, bg);

    while (ratio < MIN_GRAPH_CONTRAST && saturation < 0.98) {
        saturation = Math.min(0.98, saturation + 0.04);
        rgb = hslToRgb(hue, saturation, lightness);
        ratio = getContrastRatio(rgb, bg);
    }

    while (ratio < MIN_GRAPH_CONTRAST && lightness > LIGHT_BG_MIN_LIGHTNESS) {
        lightness -= 0.008;
        rgb = hslToRgb(hue, saturation, lightness);
        ratio = getContrastRatio(rgb, bg);
    }

    return rgbToHex(...rgb);
}

export function adjustBranchColoursForLightBackground(
    colours: ReadonlyArray<string>,
    background: string,
): string[] {
    if (!isLightBackground(background)) {
        return [...colours];
    }
    const adjusted: string[] = [];
    for (const colour of colours) {
        adjusted.push(adjustColourForLightBackground(colour, background));
    }
    return adjusted;
}

export function getVertexColour(
    vertexColors: ReadonlyArray<number>,
    colours: ReadonlyArray<string>,
    index: number,
): string {
    const colourIndex = vertexColors[index] ?? 0;
    return colours[colourIndex % colours.length];
}
