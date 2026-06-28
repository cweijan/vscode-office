import heic2any from 'heic2any';
import * as UTIF from 'utif';

export type ImageSource = {
    src?: string;
    title?: string;
    ext?: string;
    mime?: string;
    buffer?: number[];
};

function bufferToBlob(buffer: number[], mime: string): Blob {
    const bytes = new Uint8Array(buffer.length);
    for (let i = 0; i < buffer.length; i++) {
        bytes[i] = buffer[i];
    }
    return new Blob([bytes], { type: mime });
}

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

export function needsConversion(image: ImageSource): boolean {
    return getFormatHint(image.src ?? '', image.ext) !== null;
}

async function loadImageBlob(image: ImageSource, format: 'heic' | 'tiff'): Promise<Blob> {
    if (image.buffer?.length) {
        const mime = image.mime ?? (format === 'heic' ? 'image/heic' : 'image/tiff');
        return bufferToBlob(image.buffer, mime);
    }
    const src = image.src ?? '';
    if (src.startsWith('data:')) {
        const response = await fetch(src);
        const blob = await response.blob();
        if (blob.type) {
            return blob;
        }
        const mime = format === 'heic' ? 'image/heic' : 'image/tiff';
        return new Blob([await blob.arrayBuffer()], { type: mime });
    }
    throw new Error('Missing image buffer');
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

export async function resolveImageSrc(image: ImageSource): Promise<string> {
    const format = getFormatHint(image.src ?? '', image.ext);
    if (format) {
        const blob = await loadImageBlob(image, format);
        if (format === 'heic') {
            return convertHeic(blob);
        }
        return convertTiff(blob);
    }
    if (image.buffer?.length) {
        const mime = image.mime ?? 'application/octet-stream';
        return URL.createObjectURL(bufferToBlob(image.buffer, mime));
    }
    throw new Error('Missing image buffer');
}

export function revokeObjectUrl(url: string) {
    if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
    }
}
