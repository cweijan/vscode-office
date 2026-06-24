import { getConfigs } from '../../util/vscodeConfig';

interface IconMaps {
    extToIconFile: Record<string, string>;
    fileNameToIconFile: Record<string, string>;
    folderToIconFile: Record<string, string>;
    folderExpandedToIconFile: Record<string, string>;
    defaultFileIcon: string;
    defaultFolderIcon: string;
    defaultFolderExpandedIcon: string;
}

function getIconMaps(): IconMaps | null {
    const configs = getConfigs();
    if (!configs?.iconBaseUrl || !configs?.maps) {
        return null;
    }
    return configs.maps as IconMaps;
}

function basename(filePath: string): string {
    const normalized = filePath.replace(/\\/g, '/');
    const index = normalized.lastIndexOf('/');
    return index >= 0 ? normalized.slice(index + 1) : normalized;
}

function getExtensions(fileName: string): string[] {
    const base = basename(fileName).toLowerCase();
    const parts = base.split('.');
    if (parts.length <= 1) {
        return [];
    }
    const exts: string[] = [];
    for (let i = 1; i < parts.length; i++) {
        exts.push(parts.slice(i).join('.'));
    }
    return exts;
}

function resolveFileIcon(fileName: string, maps: IconMaps): string {
    const base = basename(fileName).toLowerCase();
    const byName = maps.fileNameToIconFile[base];
    if (byName) {
        return byName;
    }

    const exts = getExtensions(fileName);
    for (const ext of exts) {
        const iconFile = maps.extToIconFile[ext];
        if (iconFile) {
            return iconFile;
        }
    }

    return maps.defaultFileIcon;
}

function resolveFolderIcon(folderName: string, maps: IconMaps, expanded = false): string {
    const key = folderName.toLowerCase();
    if (expanded) {
        const expandedIcon = maps.folderExpandedToIconFile[key];
        if (expandedIcon) {
            return expandedIcon;
        }
    }
    const iconFile = maps.folderToIconFile[key];
    if (iconFile) {
        return iconFile;
    }
    return expanded ? maps.defaultFolderExpandedIcon : maps.defaultFolderIcon;
}

function buildIconUrl(fileName: string): string | null {
    const baseUrl = getConfigs()?.iconBaseUrl;
    if (!baseUrl) {
        return null;
    }
    return `${baseUrl}/${fileName}`;
}

export function getIconFileName(fileName: string): string {
    const maps = getIconMaps();
    if (!maps) {
        return 'file.svg';
    }
    return resolveFileIcon(fileName, maps);
}

export function getFolderIconFileName(folderName: string, expanded = false): string {
    const maps = getIconMaps();
    if (!maps) {
        return expanded ? 'folder-open.svg' : 'folder.svg';
    }
    return resolveFolderIcon(folderName, maps, expanded);
}

export function getFileIconUrl(fileName: string): string | null {
    const maps = getIconMaps();
    if (!maps || !fileName) {
        return null;
    }
    return buildIconUrl(resolveFileIcon(fileName, maps));
}

export function getFolderIconUrl(folderName: string, expanded = false): string | null {
    const maps = getIconMaps();
    if (!maps || !folderName) {
        return null;
    }
    return buildIconUrl(resolveFolderIcon(folderName, maps, expanded));
}
