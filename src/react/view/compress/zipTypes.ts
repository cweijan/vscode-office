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
}

interface EntryHeader {
    time: Date | string;
    compressedSize: number;
    size: number;
}
