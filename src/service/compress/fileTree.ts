import { basename } from 'path';

export interface ArchiveFileInfo {
    name: string;
    entryName: string;
    fileSize: number;
    compressedSize: number;
    isDirectory?: boolean;
    children?: ArchiveFileInfo[];
    modifyDateTime?: string | null;
    fileSizeOrigin?: number;
    compressedSizeOrigin?: number;
}

export function buildFileTree(
    items: { path: string; fileSize: number; compressedSize: number; isDirectory: boolean; modifyDateTime?: string | null }[],
): { files: ArchiveFileInfo[]; folderMap: Record<string, ArchiveFileInfo>; filePaths: string[] } {
    const folderMap: Record<string, ArchiveFileInfo> = {};
    const files: ArchiveFileInfo[] = [];
    const filePaths: string[] = [];

    for (const item of items) {
        const path = item.path.replace(/\\/g, '/');
        const isDirectory = item.isDirectory;
        const dirPath = isDirectory ? path.replace(/\/$/, '') : path.substring(0, path.lastIndexOf('/'));
        if (!isDirectory) filePaths.push(path);

        if (!isDirectory) {
            const fileInfo: ArchiveFileInfo = {
                name: basename(path),
                entryName: path,
                fileSize: item.fileSize,
                compressedSize: item.compressedSize,
                fileSizeOrigin: item.fileSize,
                compressedSizeOrigin: item.compressedSize,
                modifyDateTime: item.modifyDateTime,
                isDirectory: false,
            };

            if (dirPath) {
                if (!folderMap[dirPath]) {
                    const dirInfo: ArchiveFileInfo = {
                        name: basename(dirPath),
                        entryName: dirPath,
                        fileSize: 0,
                        compressedSize: 0,
                        isDirectory: true,
                        children: [],
                    };
                    files.push(dirInfo);
                    folderMap[dirPath] = dirInfo;
                }
                folderMap[dirPath].children!.push(fileInfo);
            } else {
                files.push(fileInfo);
            }
        } else {
            const normalizedPath = path.replace(/\/$/, '');
            if (!folderMap[normalizedPath]) {
                const dirInfo: ArchiveFileInfo = {
                    name: basename(normalizedPath),
                    entryName: normalizedPath,
                    fileSize: 0,
                    compressedSize: 0,
                    isDirectory: true,
                    children: [],
                };
                files.push(dirInfo);
                folderMap[normalizedPath] = dirInfo;
            }
        }
    }

    return { files, folderMap, filePaths };
}
