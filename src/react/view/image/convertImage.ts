import heic2any from 'heic2any';
import * as UTIF from 'utif';

const CONVERTIBLE_EXT = /\.(heic|heif|tiff?)$/i;

export function needsConversion(src: string): boolean {
    return CONVERTIBLE_EXT.test(getPathname(src));
}

function getPathname(src: string): string {
    try {
        return new URL(src).pathname;
    } catch {
        return src.split('?')[0];
    }
}

async function convertHeic(blob: Blob): Promise<string> {
    const result = await heic2any({ blob, toType: 'image/jpeg', quality: 0.92 });
    const converted = Array.isArray(result) ? result[0] : result;
    return URL.createObjectURL(converted);
}

async function convertTiff(blob: Blob): Promise<string> {
    const buffer = await blob.arrayBuffer();
    const ifds = UTIF.decode(buffer);
    if (!ifds.length) {
        throw new Error('Invalid TIFF file');
    }
    UTIF.decodeImage(buffer, ifds[0]);
    const rgba = UTIF.toRGBA8(ifds[0]);
    const canvas = document.createElement('canvas');
    canvas.width = ifds[0].width;
    canvas.height = ifds[0].height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Failed to create canvas context');
    }
    ctx.putImageData(
        new ImageData(new Uint8ClampedArray(rgba), ifds[0].width, ifds[0].height),
        0, 0
    );
    return canvas.toDataURL('image/png');
}

export async function resolveImageSrc(src: string): Promise<string> {
    if (!needsConversion(src)) {
        return src;
    }
    const response = await fetch(src);
    if (!response.ok) {
        throw new Error(`Failed to load image: ${response.status}`);
    }
    const blob = await response.blob();
    const pathname = getPathname(src);
    if (/\.(heic|heif)$/i.test(pathname)) {
        return convertHeic(blob);
    }
    return convertTiff(blob);
}

export function revokeObjectUrl(url: string) {
    if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
    }
}
