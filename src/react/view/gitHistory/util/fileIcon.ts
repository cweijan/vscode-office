export function getFileCodicon(filePath: string): string {
    const baseName = filePath.split(/[/\\]/).pop() ?? filePath;
    const dot = baseName.lastIndexOf('.');
    const ext = dot > 0 ? baseName.substring(dot + 1).toLowerCase() : '';

    switch (ext) {
        case 'ts':
        case 'tsx':
        case 'js':
        case 'jsx':
        case 'mjs':
        case 'cjs':
        case 'py':
        case 'rb':
        case 'go':
        case 'rs':
        case 'java':
        case 'c':
        case 'cpp':
        case 'cc':
        case 'h':
        case 'hpp':
        case 'cs':
        case 'php':
        case 'swift':
        case 'kt':
        case 'scala':
        case 'vue':
        case 'svelte':
        case 'sh':
        case 'bash':
        case 'zsh':
            return 'file-code';
        case 'json':
        case 'jsonc':
            return 'json';
        case 'md':
        case 'markdown':
            return 'markdown';
        case 'yml':
        case 'yaml':
            return 'yaml';
        case 'png':
        case 'jpg':
        case 'jpeg':
        case 'gif':
        case 'webp':
        case 'bmp':
        case 'ico':
            return 'file-media';
        case 'svg':
            return 'file-media';
        case 'pdf':
            return 'file-pdf';
        case 'zip':
        case 'tar':
        case 'gz':
        case 'rar':
        case '7z':
            return 'file-zip';
        default:
            return 'file';
    }
}

export function getChangeIconPath(change: { type: string; oldFilePath: string; newFilePath: string }): string {
    if (change.type === 'D') {
        return change.oldFilePath;
    }
    return change.newFilePath;
}

/** Indent per tree depth (px). */
export const CDV_TREE_INDENT = 16;

export const CDV_ROW_BASE_PADDING = 4;

export function fileRowPaddingLeft(depth: number): number {
    return CDV_ROW_BASE_PADDING + depth * CDV_TREE_INDENT;
}

export function folderRowPaddingLeft(depth: number): number {
    return CDV_ROW_BASE_PADDING + depth * CDV_TREE_INDENT;
}

export function getFolderCodicon(isOpen: boolean, depth: number): string {
    if (depth === 0) {
        return isOpen ? 'root-folder-opened' : 'root-folder';
    }
    return isOpen ? 'folder-opened' : 'folder';
}
