export type ZipFilenameEncoding = 'utf8' | 'gbk';

const SIG_CENTRAL_DIR = 0x02014b50;
const SIG_EOCD = 0x06054b50;
const UTF8_FLAG = 0x0800;

function isValidUtf8(bytes: Uint8Array): boolean {
    try {
        new TextDecoder('utf-8', { fatal: true }).decode(bytes);
        return true;
    } catch {
        return false;
    }
}

export function detectZipFilenameEncoding(data: Buffer | Uint8Array): ZipFilenameEncoding {
    const bytes = data instanceof Buffer ? data : Buffer.from(data);
    const minEocd = Math.max(0, bytes.length - 65558);
    let eocdOffset = -1;
    for (let i = bytes.length - 22; i >= minEocd; i--) {
        if (bytes.readUInt32LE(i) === SIG_EOCD) {
            eocdOffset = i;
            break;
        }
    }
    if (eocdOffset < 0) {
        return 'utf8';
    }

    const numEntries = bytes.readUInt16LE(eocdOffset + 10);
    const centralDirOffset = bytes.readUInt32LE(eocdOffset + 16);
    let offset = centralDirOffset;
    let hasUtf8Flag = false;
    const filenameBytes: number[] = [];

    for (let i = 0; i < numEntries; i++) {
        if (offset + 46 > bytes.length || bytes.readUInt32LE(offset) !== SIG_CENTRAL_DIR) {
            break;
        }
        const flags = bytes.readUInt16LE(offset + 8);
        if (flags & UTF8_FLAG) {
            hasUtf8Flag = true;
        }
        const nameLen = bytes.readUInt16LE(offset + 28);
        const extraLen = bytes.readUInt16LE(offset + 30);
        const commentLen = bytes.readUInt16LE(offset + 32);
        const nameStart = offset + 46;
        const nameEnd = nameStart + nameLen;
        if (nameEnd > bytes.length) {
            break;
        }
        for (let j = nameStart; j < nameEnd; j++) {
            filenameBytes.push(bytes[j]);
        }
        offset = nameEnd + extraLen + commentLen;
    }

    if (hasUtf8Flag) {
        return 'utf8';
    }
    if (filenameBytes.length === 0) {
        return 'utf8';
    }
    return isValidUtf8(new Uint8Array(filenameBytes)) ? 'utf8' : 'gbk';
}
