import type { GitFileChange } from '../types';

export type FileViewMode = 'tree' | 'flat';

export interface FileTreeFolder {
    kind: 'folder';
    name: string;
    path: string;
    children: FileTreeNode[];
}

export interface FileTreeFile {
    kind: 'file';
    change: GitFileChange;
    displayPath: string;
    name: string;
}

export type FileTreeNode = FileTreeFolder | FileTreeFile;

export const FILE_CHANGE_STATUS_CLASS: Record<string, string> = {
    A: 'git-graph-status-added',
    M: 'git-graph-status-modified',
    D: 'git-graph-status-deleted',
    R: 'git-graph-status-renamed',
    U: 'git-graph-status-untracked',
};

export function getChangeDisplayPath(change: GitFileChange): string {
    if (change.type === 'D') {
        return change.oldFilePath;
    }
    if (change.type === 'R' && change.oldFilePath !== change.newFilePath) {
        return `${change.oldFilePath} → ${change.newFilePath}`;
    }
    return change.newFilePath;
}

function sortTreeNodes(nodes: FileTreeNode[]): void {
    nodes.sort((a, b) => {
        if (a.kind !== b.kind) {
            return a.kind === 'folder' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
    });
    for (const node of nodes) {
        if (node.kind === 'folder') {
            sortTreeNodes(node.children);
        }
    }
}

function compactFolders(nodes: FileTreeNode[]): FileTreeNode[] {
    const result: FileTreeNode[] = [];
    for (const node of nodes) {
        if (node.kind === 'folder') {
            let merged = node;
            const nameParts = [merged.name];
            while (
                merged.children.length === 1
                && merged.children[0].kind === 'folder'
            ) {
                merged = merged.children[0];
                nameParts.push(merged.name);
            }
            result.push({
                kind: 'folder',
                name: nameParts.join('/'),
                path: merged.path,
                children: compactFolders(merged.children),
            });
        } else {
            result.push(node);
        }
    }
    return result;
}

export function buildFileTree(changes: GitFileChange[]): FileTreeNode[] {
    const root: FileTreeFolder = { kind: 'folder', name: '', path: '', children: [] };
    const folderMap = new Map<string, FileTreeFolder>();
    folderMap.set('', root);

    for (const change of changes) {
        const displayPath = getChangeDisplayPath(change);
        const filePath = change.type === 'D' ? change.oldFilePath : change.newFilePath;
        const normalized = filePath.replace(/\\/g, '/');
        const parts = normalized.split('/');
        const fileName = parts.pop() ?? normalized;
        let current = root;
        let pathAcc = '';
        for (const part of parts) {
            pathAcc = pathAcc ? `${pathAcc}/${part}` : part;
            let folder = folderMap.get(pathAcc);
            if (!folder) {
                folder = { kind: 'folder', name: part, path: pathAcc, children: [] };
                folderMap.set(pathAcc, folder);
                current.children.push(folder);
            }
            current = folder;
        }
        current.children.push({
            kind: 'file',
            change,
            displayPath,
            name: fileName,
        });
    }

    sortTreeNodes(root.children);
    return compactFolders(root.children);
}

export function collectFolderPaths(nodes: FileTreeNode[]): string[] {
    const paths: string[] = [];
    for (const node of nodes) {
        if (node.kind === 'folder') {
            paths.push(node.path);
            for (const childPath of collectFolderPaths(node.children)) {
                paths.push(childPath);
            }
        }
    }
    return paths;
}

export function sortFlatFileChanges(changes: GitFileChange[]): GitFileChange[] {
    const sorted = [...changes];
    sorted.sort((a, b) => getChangeDisplayPath(a).localeCompare(getChangeDisplayPath(b)));
    return sorted;
}
