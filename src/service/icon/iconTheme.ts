export interface MaterialIconThemeJson {
    iconDefinitions: Record<string, { iconPath: string }>;
    fileExtensions: Record<string, string>;
    fileNames: Record<string, string>;
    folderNames: Record<string, string>;
    folderNamesExpanded: Record<string, string>;
    file: string;
    folder: string;
    folderExpanded: string;
}

export interface IconMaps {
    extToIconFile: Record<string, string>;
    fileNameToIconFile: Record<string, string>;
    folderToIconFile: Record<string, string>;
    folderExpandedToIconFile: Record<string, string>;
    defaultFileIcon: string;
    defaultFolderIcon: string;
    defaultFolderExpandedIcon: string;
}

function iconNameToFileName(iconDefinitions: Record<string, { iconPath: string }>, iconName: string): string {
    const def = iconDefinitions[iconName];
    if (!def?.iconPath) {
        return `${iconName}.svg`;
    }
    const normalized = def.iconPath.replace(/\\/g, '/');
    const slash = normalized.lastIndexOf('/');
    return slash >= 0 ? normalized.slice(slash + 1) : normalized;
}

function mapAssociationToFiles(
    associations: Record<string, string>,
    iconDefinitions: Record<string, { iconPath: string }>,
): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, iconName] of Object.entries(associations)) {
        result[key.toLowerCase()] = iconNameToFileName(iconDefinitions, iconName);
    }
    return result;
}

export function buildIconMaps(theme: MaterialIconThemeJson): IconMaps {
    const { iconDefinitions } = theme;
    return {
        extToIconFile: mapAssociationToFiles(theme.fileExtensions, iconDefinitions),
        fileNameToIconFile: mapAssociationToFiles(theme.fileNames, iconDefinitions),
        folderToIconFile: mapAssociationToFiles(theme.folderNames, iconDefinitions),
        folderExpandedToIconFile: mapAssociationToFiles(theme.folderNamesExpanded, iconDefinitions),
        defaultFileIcon: iconNameToFileName(iconDefinitions, theme.file),
        defaultFolderIcon: iconNameToFileName(iconDefinitions, theme.folder),
        defaultFolderExpandedIcon: iconNameToFileName(iconDefinitions, theme.folderExpanded),
    };
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

export function resolveFileIcon(fileName: string, maps: IconMaps): string {
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

export function resolveFolderIcon(folderName: string, maps: IconMaps, expanded = false): string {
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
