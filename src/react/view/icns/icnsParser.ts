export interface IcnsIconItem {
    id: string;
    type: string;
    size: number;
    label: string;
    dataUrl: string;
}

interface IcnsEntry {
    type: string;
    data: Uint8Array;
}

const MASK_TYPES = new Set(['s8mk', 'l8mk', 'h8mk', 't8mk']);

const ICNS_META: Record<string, { size: number; label?: string }> = {
    is32: { size: 16 },
    il32: { size: 32 },
    ih32: { size: 48 },
    it32: { size: 128 },
    ic04: { size: 16 },
    ic05: { size: 32 },
    icp4: { size: 16 },
    icp5: { size: 32 },
    icp6: { size: 64 },
    ic07: { size: 128 },
    ic08: { size: 256 },
    ic09: { size: 512 },
    ic10: { size: 1024 },
    ic11: { size: 32, label: '16×16 @2x' },
    ic12: { size: 64, label: '32×32 @2x' },
    ic13: { size: 256, label: '128×128 @2x' },
    ic14: { size: 512, label: '256×256 @2x' },
};

const ICNS_RGB_MASK: Record<string, string> = {
    is32: 's8mk',
    il32: 'l8mk',
    ih32: 'h8mk',
    it32: 't8mk',
};

const PNG_MASK: Record<string, { maskType: string; maskSize: number }> = {
    icp4: { maskType: 's8mk', maskSize: 16 },
    icp5: { maskType: 'l8mk', maskSize: 32 },
    ic07: { maskType: 't8mk', maskSize: 128 },
    ic11: { maskType: 's8mk', maskSize: 16 },
    ic12: { maskType: 'l8mk', maskSize: 32 },
    ic13: { maskType: 't8mk', maskSize: 128 },
};

const DISPLAY_TYPES = [
    'icp4', 'icp5', 'icp6', 'ic07', 'ic08', 'ic09', 'ic10',
    'ic11', 'ic12', 'ic13', 'ic14',
    'ic04', 'ic05',
    'is32', 'il32', 'ih32', 'it32',
];

function isPng(data: Uint8Array): boolean {
    return data.length >= 8
        && data[0] === 0x89
        && data[1] === 0x50
        && data[2] === 0x4E
        && data[3] === 0x47;
}

function getPngColorType(data: Uint8Array): number | null {
    if (!isPng(data) || data.length < 26) {
        return null;
    }
    return data[25];
}

function parseIcnsEntries(buffer: ArrayBuffer): IcnsEntry[] {
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);
    if (bytes.length < 8) {
        throw new Error('Invalid ICNS file');
    }
    const magic = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
    if (magic !== 'icns') {
        throw new Error('Invalid ICNS file');
    }
    const fileLength = view.getUint32(4, false);
    const entries: IcnsEntry[] = [];
    let pos = 8;
    while (pos + 8 <= fileLength && pos + 8 <= bytes.length) {
        const type = String.fromCharCode(bytes[pos], bytes[pos + 1], bytes[pos + 2], bytes[pos + 3]);
        const length = view.getUint32(pos + 4, false);
        if (length < 8 || pos + length > bytes.length) {
            break;
        }
        entries.push({
            type,
            data: bytes.slice(pos + 8, pos + length),
        });
        pos += length;
    }
    if (!entries.length) {
        throw new Error('Invalid ICNS file');
    }
    return entries;
}

function decodeIcnsChannel(data: Uint8Array, start: number, expectedLength: number): { channel: Uint8Array; nextPos: number } {
    const parts: Uint8Array[] = [];
    let i = start;
    let length = 0;
    while (length < expectedLength && i < data.length) {
        const header = data[i];
        if (header >= 128) {
            const count = header - 125;
            const value = data[i + 1];
            parts.push(new Uint8Array(count).fill(value));
            length += count;
            i += 2;
        } else {
            const count = header + 1;
            parts.push(data.slice(i + 1, i + 1 + count));
            length += count;
            i += 1 + count;
        }
    }
    const channel = new Uint8Array(expectedLength);
    let offset = 0;
    for (const part of parts) {
        const copyLength = Math.min(part.length, expectedLength - offset);
        channel.set(part.subarray(0, copyLength), offset);
        offset += copyLength;
    }
    return { channel, nextPos: i };
}

function decodeIcnsChannels(data: Uint8Array, channelCount: number, pixels: number, skipHeader = false): Uint8Array[] {
    let pos = skipHeader ? 4 : 0;
    const channels: Uint8Array[] = [];
    for (let i = 0; i < channelCount; i++) {
        const decoded = decodeIcnsChannel(data, pos, pixels);
        channels.push(decoded.channel);
        pos = decoded.nextPos;
    }
    return channels;
}

function isGrayPixel(data: Uint8ClampedArray, index: number): boolean {
    const r = data[index];
    const g = data[index + 1];
    const b = data[index + 2];
    return Math.abs(r - g) <= 8 && Math.abs(g - b) <= 8;
}

function luminance(data: Uint8ClampedArray, index: number): number {
    return (data[index] + data[index + 1] + data[index + 2]) / 3;
}

function stripSimulatedTransparency(imageData: ImageData): void {
    const { data, width, height } = imageData;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            if (data[i + 3] < 8) {
                data[i] = 0;
                data[i + 1] = 0;
                data[i + 2] = 0;
                data[i + 3] = 0;
                continue;
            }
            if (!isGrayPixel(data, i)) {
                continue;
            }

            const lum = luminance(data, i);
            if (lum < 140 || lum > 255) {
                continue;
            }

            const right = x + 1 < width ? (y * width + (x + 1)) * 4 : -1;
            const down = y + 1 < height ? ((y + 1) * width + x) * 4 : -1;
            const diag = x + 1 < width && y + 1 < height ? ((y + 1) * width + (x + 1)) * 4 : -1;
            if (right < 0 || down < 0 || diag < 0) {
                continue;
            }
            if (!isGrayPixel(data, right) || !isGrayPixel(data, down) || !isGrayPixel(data, diag)) {
                continue;
            }

            const rightLum = luminance(data, right);
            const downLum = luminance(data, down);
            const diagLum = luminance(data, diag);
            const horizDiff = Math.abs(lum - rightLum);
            const vertDiff = Math.abs(lum - downLum);
            const diagDiff = Math.abs(lum - diagLum);

            if (horizDiff < 18 || vertDiff < 18 || diagDiff > 30) {
                continue;
            }

            data[i] = 0;
            data[i + 1] = 0;
            data[i + 2] = 0;
            data[i + 3] = 0;
        }
    }
}

function normalizeAlpha(imageData: ImageData): void {
    const { data } = imageData;
    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) {
            data[i] = 0;
            data[i + 1] = 0;
            data[i + 2] = 0;
        }
    }
}

function applyMask(imageData: ImageData, mask: Uint8Array, maskSize: number): void {
    const { width, height, data } = imageData;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const mx = Math.min(maskSize - 1, Math.floor(x * maskSize / width));
            const my = Math.min(maskSize - 1, Math.floor(y * maskSize / height));
            data[i + 3] = mask[my * maskSize + mx];
        }
    }
}

function imageDataToDataUrl(imageData: ImageData): string {
    normalizeAlpha(imageData);
    stripSimulatedTransparency(imageData);
    normalizeAlpha(imageData);

    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Failed to create canvas context');
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/png');
}

async function loadPngImageData(data: Uint8Array): Promise<ImageData> {
    const bitmap = await createImageBitmap(new Blob([data.slice()], { type: 'image/png' }));
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        bitmap.close();
        throw new Error('Failed to create canvas context');
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function decodeMaskChannel(maskData: Uint8Array, maskSize: number): Uint8Array {
    return decodeIcnsChannel(maskData, 0, maskSize * maskSize).channel;
}

async function decodePngEntry(data: Uint8Array, type: string, byType: Map<string, IcnsEntry>): Promise<string> {
    const imageData = await loadPngImageData(data);
    const colorType = getPngColorType(data);
    const maskInfo = PNG_MASK[type];

    if (maskInfo && (colorType === 2 || colorType === 3)) {
        const maskEntry = byType.get(maskInfo.maskType);
        if (maskEntry) {
            const mask = decodeMaskChannel(maskEntry.data, maskInfo.maskSize);
            applyMask(imageData, mask, maskInfo.maskSize);
        }
    }

    return imageDataToDataUrl(imageData);
}

function decodeArgbEntry(data: Uint8Array, size: number): string {
    const pixels = size * size;
    const hasHeader = data.length >= 4
        && data[0] === 0x41
        && data[1] === 0x52
        && data[2] === 0x47
        && data[3] === 0x42;
    const [a, r, g, b] = decodeIcnsChannels(data, 4, pixels, hasHeader);
    const rgba = new Uint8ClampedArray(pixels * 4);
    for (let i = 0; i < pixels; i++) {
        rgba[i * 4] = r[i];
        rgba[i * 4 + 1] = g[i];
        rgba[i * 4 + 2] = b[i];
        rgba[i * 4 + 3] = a[i];
    }
    return imageDataToDataUrl(new ImageData(rgba, size, size));
}

function decodeRgbEntry(data: Uint8Array, size: number, skipOffset: boolean, maskData?: Uint8Array): string {
    const pixels = size * size;
    const pos = skipOffset ? 4 : 0;
    const red = decodeIcnsChannel(data, pos, pixels);
    const green = decodeIcnsChannel(data, red.nextPos, pixels);
    const blue = decodeIcnsChannel(data, green.nextPos, pixels);
    let alpha: Uint8Array;
    if (maskData) {
        alpha = decodeIcnsChannel(maskData, 0, pixels).channel;
    } else {
        alpha = new Uint8Array(pixels).fill(255);
    }
    const rgba = new Uint8ClampedArray(pixels * 4);
    for (let i = 0; i < pixels; i++) {
        rgba[i * 4] = red.channel[i];
        rgba[i * 4 + 1] = green.channel[i];
        rgba[i * 4 + 2] = blue.channel[i];
        rgba[i * 4 + 3] = alpha[i];
    }
    return imageDataToDataUrl(new ImageData(rgba, size, size));
}

async function decodeEntry(type: string, entry: IcnsEntry, byType: Map<string, IcnsEntry>): Promise<string | null> {
    const meta = ICNS_META[type];
    if (!meta) {
        return null;
    }
    if (isPng(entry.data)) {
        return decodePngEntry(entry.data, type, byType);
    }
    if (type === 'ic04' || type === 'ic05') {
        return decodeArgbEntry(entry.data, meta.size);
    }
    const maskType = ICNS_RGB_MASK[type];
    if (maskType) {
        const mask = byType.get(maskType);
        return decodeRgbEntry(entry.data, meta.size, type === 'it32', mask?.data);
    }
    return null;
}

function formatLabel(type: string, size: number): string {
    const meta = ICNS_META[type];
    if (meta?.label) {
        return meta.label;
    }
    return `${size}×${size}`;
}

export async function parseIcnsIcons(buffer: ArrayBuffer): Promise<IcnsIconItem[]> {
    const entries = parseIcnsEntries(buffer);
    const byType = new Map<string, IcnsEntry>();
    for (const entry of entries) {
        if (!MASK_TYPES.has(entry.type)) {
            byType.set(entry.type, entry);
        }
    }

    const icons: IcnsIconItem[] = [];
    for (const type of DISPLAY_TYPES) {
        const entry = byType.get(type);
        const meta = ICNS_META[type];
        if (!entry || !meta) {
            continue;
        }
        const dataUrl = await decodeEntry(type, entry, byType);
        if (!dataUrl) {
            continue;
        }
        icons.push({
            id: type,
            type,
            size: meta.size,
            label: formatLabel(type, meta.size),
            dataUrl,
        });
    }

    icons.sort((a, b) => a.size - b.size || a.type.localeCompare(b.type));
    if (!icons.length) {
        throw new Error('No supported icon sizes found in ICNS file');
    }
    return icons;
}
