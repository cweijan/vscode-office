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

function sortEntries(a: ArchiveFileInfo, b: ArchiveFileInfo): number {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return (a.name ?? '').localeCompare(b.name ?? '');
}

function ensureFolder(
    folderPath: string,
    folderMap: Record<string, ArchiveFileInfo>,
    files: ArchiveFileInfo[],
): ArchiveFileInfo {
    if (folderMap[folderPath]) {
        return folderMap[folderPath];
    }

    const dirInfo: ArchiveFileInfo = {
        name: basename(folderPath),
        entryName: folderPath,
        fileSize: 0,
        compressedSize: 0,
        isDirectory: true,
        children: [],
    };
    folderMap[folderPath] = dirInfo;

    const slash = folderPath.lastIndexOf('/');
    if (slash >= 0) {
        const parentPath = folderPath.substring(0, slash);
        ensureFolder(parentPath, folderMap, files).children!.push(dirInfo);
    } else {
        files.push(dirInfo);
    }

    return dirInfo;
}

export function buildFileTree(
    items: { path: string; fileSize: number; compressedSize: number; isDirectory: boolean; modifyDateTime?: string | null }[],
): { files: ArchiveFileInfo[]; folderMap: Record<string, ArchiveFileInfo>; filePaths: string[] } {
    const folderMap: Record<string, ArchiveFileInfo> = {};
    const files: ArchiveFileInfo[] = [];
    const filePaths: string[] = [];

    for (const item of items) {
        const path = item.path.replace(/\\/g, '/').replace(/\/+$/, '');
        if (!path) continue;

        if (item.isDirectory) {
            ensureFolder(path, folderMap, files);
            continue;
        }

        filePaths.push(path);
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

        const slash = path.lastIndexOf('/');
        if (slash >= 0) {
            const parentPath = path.substring(0, slash);
            ensureFolder(parentPath, folderMap, files).children!.push(fileInfo);
        } else {
            files.push(fileInfo);
        }
    }

    files.sort(sortEntries);
    for (const key in folderMap) {
        folderMap[key].children!.sort(sortEntries);
    }

    return { files, folderMap, filePaths };
}
