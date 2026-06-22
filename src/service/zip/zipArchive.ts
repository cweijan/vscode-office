import {
    BlobReader,
    BlobWriter,
    Uint8ArrayReader,
    Uint8ArrayWriter,
    ZipReader,
    ZipWriter,
    type Entry,
    type FileEntry,
} from '@zip.js/zip.js';
import iconv from 'iconv-lite';
import format from 'date-format';
import { mkdirSync, writeFileSync } from 'fs';
import { basename, resolve } from 'path';
import prettyBytes from './pretty-bytes';
import { detectZipFilenameEncoding } from './zipEncoding';
import { unwrapCrx } from '@/service/compress/archiveUtils';

export interface ZipDisplayEntry {
    name?: string;
    isDirectory?: boolean;
    entryName?: string;
    children?: ZipDisplayEntry[];
    fileSize?: string;
    fileSizeOrigin?: number;
    compressedSize?: string;
    compressedSizeOrigin?: number;
    modifyDateTime?: string | null;
    encrypted?: boolean;
}

export interface ZipParseResult {
    files: ZipDisplayEntry[];
    fileMap: Record<string, FileEntry>;
    folderMap: Record<string, ZipDisplayEntry>;
    encrypted: boolean;
}

function normalizePath(path: string): string {
    return path.replace(/\\/g, '/').replace(/\/+$/, '');
}

function getReaderOptions(encoding?: string) {
    if (!encoding || encoding === 'utf8') return {};
    return {
        filenameEncoding: encoding,
        decodeText: (value: Uint8Array) => iconv.decode(Buffer.from(value), encoding),
    };
}

function getWriterOptions(encoding?: string) {
    if (!encoding || encoding === 'utf8') return {};
    return {
        useUnicodeFileNames: false,
        encodeText: (value: string) => new Uint8Array(iconv.encode(value, encoding)),
    };
}

function buildTree(entries: Entry[]): ZipParseResult {
    const fileMap: Record<string, FileEntry> = {};
    const folderMap: Record<string, ZipDisplayEntry> = {};
    const pathMap: Record<string, 1> = {};
    let files: ZipDisplayEntry[] = [];
    let encrypted = false;

    const pushEntry = (entry: ZipDisplayEntry) => {
        if (!entry.entryName || pathMap[entry.entryName]) return;
        pathMap[entry.entryName] = 1;
        const paths = entry.entryName.split('/');
        paths.pop();
        if (paths.length === 0) {
            files.push(entry);
            return;
        }
        const parentPath = paths.join('/');
        if (folderMap[parentPath]) {
            folderMap[parentPath].children!.push(entry);
            return;
        }
        const parentEntry: ZipDisplayEntry = {
            isDirectory: true,
            children: [entry],
            entryName: parentPath,
            name: basename(parentPath),
        };
        folderMap[parentPath] = parentEntry;
        pushEntry(parentEntry);
    };

    for (const raw of entries) {
        const entryName = normalizePath(raw.filename);
        if (!entryName && !raw.directory) continue;
        const displayName = raw.directory ? entryName : entryName;
        if (raw.encrypted) encrypted = true;

        if (!raw.directory) {
            fileMap[displayName] = raw as FileEntry;
        }

        pushEntry({
            isDirectory: raw.directory,
            name: raw.directory ? basename(displayName) : basename(displayName),
            entryName: displayName,
            encrypted: raw.encrypted,
            fileSizeOrigin: raw.uncompressedSize,
            compressedSizeOrigin: raw.compressedSize,
            fileSize: prettyBytes(raw.uncompressedSize),
            compressedSize: prettyBytes(raw.compressedSize),
            modifyDateTime: raw.lastModDate ? format('yyyy-MM-dd hh:mm:ss', raw.lastModDate) : null,
        });
    }

    for (const key in folderMap) {
        const folder = folderMap[key];
        folder.children = folder.children!.sort(sortEntries);
        folder.fileSize = prettyBytes(sum(folder.children!, 'fileSizeOrigin'));
        folder.compressedSize = prettyBytes(sum(folder.children!, 'compressedSizeOrigin'));
    }
    files = files.sort(sortEntries);

    return { files, fileMap, folderMap, encrypted };
}

function sortEntries(a: ZipDisplayEntry, b: ZipDisplayEntry) {
    if (a.isDirectory && b.isDirectory) return (a.name ?? '').localeCompare(b.name ?? '');
    if (a.isDirectory) return -1;
    if (b.isDirectory) return 1;
    return (a.name ?? '').localeCompare(b.name ?? '');
}

function sum(array: ZipDisplayEntry[], prop: 'fileSizeOrigin' | 'compressedSizeOrigin') {
    let total = 0;
    for (const item of array) {
        total += item[prop] ?? 0;
        if (item.children) total += sum(item.children, prop);
    }
    return total;
}

async function copyEntry(writer: ZipWriter<Blob>, entry: Entry, writerOptions: Record<string, unknown>) {
    const options = {
        directory: entry.directory,
        lastModDate: entry.lastModDate,
        lastAccessDate: entry.lastAccessDate,
        creationDate: entry.creationDate,
        comment: entry.comment ? new TextDecoder().decode(entry.comment) : undefined,
        externalFileAttributes: entry.externalFileAttributes,
        internalFileAttributes: entry.internalFileAttributes,
        versionMadeBy: entry.versionMadeBy,
        ...writerOptions,
    };

    if (entry.directory) {
        await writer.add(entry.filename, undefined, options);
        return;
    }

    const fileEntry = entry as FileEntry;
    const raw = await fileEntry.getData(new Uint8ArrayWriter(), { passThrough: true });
    await writer.add(entry.filename, new Uint8ArrayReader(raw), {
        ...options,
        passThrough: true,
        encrypted: entry.encrypted,
        zipCrypto: entry.zipCrypto,
        compressionMethod: entry.compressionMethod,
        uncompressedSize: entry.uncompressedSize,
    });
}

async function rebuildZip(
    data: Buffer,
    options: {
        encoding?: string;
        exclude?: string[];
        add?: { entryName: string; content: Buffer }[];
    },
): Promise<Buffer> {
    const writerOptions = getWriterOptions(options.encoding);
    const reader = new ZipReader(new BlobReader(new Blob([data])), getReaderOptions(options.encoding));
    const entries = await reader.getEntries();
    const exclude = new Set((options.exclude ?? []).map(normalizePath));
    const blobWriter = new BlobWriter('application/zip');
    const writer = new ZipWriter(blobWriter, writerOptions);

    for (const entry of entries) {
        const name = normalizePath(entry.filename);
        if (exclude.has(name)) continue;
        await copyEntry(writer, entry, writerOptions);
    }

    for (const item of options.add ?? []) {
        const entryName = item.entryName.replace(/\\/g, '/');
        await writer.add(entryName, new Uint8ArrayReader(new Uint8Array(item.content)), writerOptions);
    }

    await writer.close();
    await reader.close();
    const blob = await blobWriter.getData();
    return Buffer.from(await blob.arrayBuffer());
}

export class ZipArchive {
    private constructor(
        private data: Buffer,
        private crxPrefix?: Buffer,
        private encoding: string = 'utf8',
    ) { }

    static async open(data: Buffer, options?: { encoding?: string }): Promise<ZipParseResult & { archive: ZipArchive; encoding: string }> {
        const { payload, prefix } = unwrapCrx(data);
        const encoding = options?.encoding ?? detectZipFilenameEncoding(payload);
        const archive = new ZipArchive(payload, prefix, encoding);
        const parsed = await archive.parse(encoding);
        return { archive, encoding, ...parsed };
    }

    async parse(encoding?: string): Promise<ZipParseResult> {
        const reader = new ZipReader(new BlobReader(new Blob([this.data])), getReaderOptions(encoding));
        const entries = await reader.getEntries();
        await reader.close();
        return buildTree(entries);
    }

    async verifyPassword(fileMap: Record<string, FileEntry>, password: string): Promise<void> {
        for (const entry of Object.values(fileMap)) {
            if (!entry.encrypted) continue;
            await entry.arrayBuffer({ password, checkPasswordOnly: true });
            return;
        }
    }

    async readEntry(entry: FileEntry, password?: string): Promise<Buffer> {
        const data = await entry.arrayBuffer({ password });
        return Buffer.from(data);
    }

    async extractAllTo(targetPath: string, password?: string, fileMap?: Record<string, FileEntry>) {
        const entries = fileMap ? Object.entries(fileMap) : [];
        for (const [entryName, entry] of entries) {
            const content = await this.readEntry(entry, password);
            const filePath = resolve(targetPath, entryName);
            mkdirSync(resolve(filePath, '..'), { recursive: true });
            writeFileSync(filePath, content);
        }
    }

    async addFile(entryName: string, content: Buffer, encoding?: string) {
        const filenameEncoding = encoding ?? this.encoding;
        this.data = await rebuildZip(this.data, {
            encoding: filenameEncoding,
            add: [{ entryName: entryName.replace(/\\/g, '/'), content }],
        });
    }

    async removeFile(entryName: string, encoding?: string) {
        const filenameEncoding = encoding ?? this.encoding;
        this.data = await rebuildZip(this.data, {
            encoding: filenameEncoding,
            exclude: [normalizePath(entryName)],
        });
    }

    toBuffer(): Buffer {
        if (this.crxPrefix) {
            return Buffer.concat([this.crxPrefix, this.data]);
        }
        return this.data;
    }
}
