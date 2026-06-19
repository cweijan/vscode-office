import iconv from 'iconv-lite';

export type CsvEncoding = 'utf8' | 'gbk';

function toUint8Array(buffer: ArrayBuffer): Uint8Array {
    return new Uint8Array(buffer);
}

function stripUtf8Bom(bytes: Uint8Array): Uint8Array {
    if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
        return bytes.subarray(3);
    }
    return bytes;
}

export function isValidUtf8(buffer: ArrayBuffer): boolean {
    try {
        new TextDecoder('utf-8', { fatal: true }).decode(toUint8Array(buffer));
        return true;
    } catch {
        return false;
    }
}

export function detectCsvEncoding(buffer: ArrayBuffer): CsvEncoding {
    const bytes = toUint8Array(buffer);
    if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
        return 'utf8';
    }
    return isValidUtf8(buffer) ? 'utf8' : 'gbk';
}

export function decodeCsvBuffer(buffer: ArrayBuffer): string {
    const encoding = detectCsvEncoding(buffer);
    if (encoding === 'utf8') {
        return new TextDecoder('utf-8').decode(stripUtf8Bom(toUint8Array(buffer)));
    }
    return iconv.decode(toUint8Array(buffer), 'gbk');
}

export function encodeCsvText(text: string, encoding: CsvEncoding): Uint8Array {
    if (encoding === 'utf8') {
        return new TextEncoder().encode(text);
    }
    return new Uint8Array(iconv.encode(text, 'gbk'));
}
