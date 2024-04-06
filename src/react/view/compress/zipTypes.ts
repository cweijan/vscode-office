export interface CompressInfo {
    fileName: string;
    files: FileInfo[];
    folderMap: { [key: string]: FileInfo };
}

export class FileInfo {
    name?: string;
    isDirectory?: boolean;
    entryName?: string;
    children?: FileInfo[]
    header?: EntryHeader;
    fileSize?: string;
    fileSizeOrigin?: number;
    compressedSize?: string;
    compressedSizeOrigin?: number;
}

interface EntryHeader {
    time: Date | string;
    compressedSize: number;
    size: number;
}
