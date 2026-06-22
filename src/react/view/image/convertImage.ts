import heic2any from 'heic2any';
import * as UTIF from 'utif';

const CONVERTIBLE_EXT = /\.(heic|heif|tiff?)$/i;

export type ImageSource = {
    src: string;
    title?: string;
    ext?: string;
};

function getPathname(src: string): string {
    try {
        return new URL(src).pathname;
    } catch {
        return src.split('?')[0];
    }
}

function getDataUrlMime(src: string): string {
    if (!src.startsWith('data:')) {
        return '';
    }
    const end = src.indexOf(';');
    return end > 5 ? src.slice(5, end).toLowerCase() : '';
}

function getFormatHint(src: string, ext?: string): 'heic' | 'tiff' | null {
    const name = ext ?? getPathname(src);
    if (/\.(heic|heif)$/i.test(name)) {
        return 'heic';
    }
    if (/\.tiff?$/i.test(name)) {
        return 'tiff';
    }
    const mime = getDataUrlMime(src);
    if (/heic|heif/.test(mime)) {
        return 'heic';
    }
    if (/tiff/.test(mime)) {
        return 'tiff';
    }
    return null;
}

export function needsConversion(src: string, ext?: string): boolean {
    return getFormatHint(src, ext) !== null;
}

async function loadImageBlob(src: string, format: 'heic' | 'tiff'): Promise<Blob> {
    if (src.startsWith('data:')) {
        const response = await fetch(src);
        const blob = await response.blob();
        if (blob.type) {
            return blob;
        }
        const mime = format === 'heic' ? 'image/heic' : 'image/tiff';
        return new Blob([await blob.arrayBuffer()], { type: mime });
    }
    const response = await fetch(src);
    if (!response.ok) {
        throw new Error(`Failed to load image: ${response.status}`);
    }
    return response.blob();
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

export async function resolveImageSrc(src: string, ext?: string): Promise<string> {
    const format = getFormatHint(src, ext);
    if (!format) {
        return src;
    }
    const blob = await loadImageBlob(src, format);
    if (format === 'heic') {
        return convertHeic(blob);
    }
    return convertTiff(blob);
}

export function revokeObjectUrl(url: string) {
    if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
    }
}
