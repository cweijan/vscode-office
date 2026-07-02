import { useMemo, useState, type MouseEvent, type ReactNode } from 'react';
import { IconArchive, IconChevronDown, IconChevronRight } from '../icons';
import { FileTypeIcon } from './FileTypeIcon';
import { FileInfo } from '../zipTypes';

interface SidebarProps {
    name?: string;
    folderMap?: Record<string, FileInfo>;
    rootFiles?: FileInfo[];
    currentDir: string;
    onClickFolder: (entryName: string | null) => void;
}

function getSingleExpandableFolderKey(rootFiles: FileInfo[], folderTree: FileInfo[]): string | null {
    if (rootFiles.length !== 1) {
        return null;
    }
    const only = rootFiles[0];
    if (!only.isDirectory || !only.entryName) {
        return null;
    }
    for (const node of folderTree) {
        if (node.entryName !== only.entryName) {
            continue;
        }
        const subfolders = node.children?.filter(child => child.isDirectory) ?? [];
        return subfolders.length > 0 ? only.entryName : null;
    }
    return null;
}

function buildFolderTree(folderMap: Record<string, FileInfo>): FileInfo[] {
    const paths = Object.keys(folderMap).sort((a, b) => a.localeCompare(b));
    const nodeMap = new Map<string, FileInfo>();
    const roots: FileInfo[] = [];

    for (const path of paths) {
        const src = folderMap[path];
        nodeMap.set(path, {
            name: src.name,
            entryName: path,
            isDirectory: true,
            children: [],
        });
    }

    for (const path of paths) {
        const node = nodeMap.get(path)!;
        const parentPath = path.includes('/') ? path.replace(/\/[^/]+$/, '') : '';
        const parent = parentPath ? nodeMap.get(parentPath) : undefined;
        if (parent) {
            parent.children!.push(node);
        } else {
            roots.push(node);
        }
    }

    const sortNodes = (nodes: FileInfo[]) => {
        nodes.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
        for (const node of nodes) {
            if (node.children?.length) sortNodes(node.children);
        }
    };
    sortNodes(roots);
    return roots;
}

interface TreeNodeProps {
    label: ReactNode;
    selected: boolean;
    expanded: boolean;
    hasChildren: boolean;
    depth: number;
    onToggle: (e: MouseEvent) => void;
    onSelect: () => void;
    children?: ReactNode;
}

function TreeNode({ label, selected, expanded, hasChildren, depth, onToggle, onSelect, children }: TreeNodeProps) {
    return (
        <div className="zip-tree-item">
            <div
                className={`zip-tree-row${selected ? ' selected' : ''}`}
                style={{ paddingLeft: `${8 + depth * 16}px` }}
            >
                <button
                    type="button"
                    className={`zip-tree-toggle${hasChildren ? '' : ' invisible'}`}
                    onClick={onToggle}
                    tabIndex={hasChildren ? 0 : -1}
                    aria-expanded={hasChildren ? expanded : undefined}
                >
                    {expanded ? <IconChevronDown size={12} /> : <IconChevronRight size={12} />}
                </button>
                <button type="button" className="zip-tree-label" onClick={onSelect}>
                    {label}
                </button>
            </div>
            {expanded && hasChildren ? <div className="zip-tree-children">{children}</div> : null}
        </div>
    );
}

function FolderNodes({
    data,
    currentDir,
    expandedKeys,
    depth,
    onToggle,
    onExpand,
    onSelectFolder,
}: {
    data: FileInfo[];
    currentDir: string;
    expandedKeys: Set<string>;
    depth: number;
    onToggle: (key: string) => void;
    onExpand: (key: string) => void;
    onSelectFolder: (entryName: string) => void;
}) {
    const nodes: ReactNode[] = [];
    for (const item of data) {
        if (!item.isDirectory || !item.entryName) continue;
        const key = item.entryName;
        const subfolders = item.children?.filter(c => c.isDirectory) ?? [];
        const hasChildren = subfolders.length > 0;
        const expanded = expandedKeys.has(key);
        nodes.push(
            <TreeNode
                key={key}
                selected={currentDir === key}
                expanded={expanded}
                hasChildren={hasChildren}
                depth={depth}
                onToggle={(e) => {
                    e.stopPropagation();
                    onToggle(key);
                }}
                onSelect={() => {
                    if (hasChildren) onExpand(key);
                    onSelectFolder(key);
                }}
                label={<><FileTypeIcon name={item.name} isDirectory expanded={expanded && hasChildren} /><span>{item.name}</span></>}
            >
                <FolderNodes
                    data={subfolders}
                    currentDir={currentDir}
                    expandedKeys={expandedKeys}
                    depth={depth + 1}
                    onToggle={onToggle}
                    onExpand={onExpand}
                    onSelectFolder={onSelectFolder}
                />
            </TreeNode>
        );
    }
    return <>{nodes}</>;
}

const ROOT_KEY = 'zip_sidebar_root';

export default function Sidebar({ name = '', folderMap, rootFiles, currentDir, onClickFolder }: SidebarProps) {
    const folderTree = useMemo(() => buildFolderTree(folderMap ?? {}), [folderMap]);
    const hasFolders = folderTree.length > 0;
    const autoExpandKey = useMemo(
        () => getSingleExpandableFolderKey(rootFiles ?? [], folderTree),
        [rootFiles, folderTree],
    );
    const [userExpandedKeys, setUserExpandedKeys] = useState<Set<string>>(() => new Set());
    const [userCollapsedKeys, setUserCollapsedKeys] = useState<Set<string>>(() => new Set());

    const expandedKeys = useMemo(() => {
        if (!hasFolders) {
            return new Set<string>();
        }
        const next = new Set<string>([ROOT_KEY]);
        if (autoExpandKey) {
            next.add(autoExpandKey);
        }
        if (currentDir) {
            next.add(currentDir);
            const parts = currentDir.split('/');
            let acc = '';
            for (const part of parts) {
                acc = acc ? `${acc}/${part}` : part;
                next.add(acc);
            }
        }
        for (const key of userExpandedKeys) {
            next.add(key);
        }
        for (const key of userCollapsedKeys) {
            if (!next.has(key) || key === ROOT_KEY) {
                continue;
            }
            if (key !== currentDir) {
                next.delete(key);
            }
        }
        return next;
    }, [autoExpandKey, currentDir, hasFolders, userCollapsedKeys, userExpandedKeys]);

    const toggleKey = (key: string) => {
        if (expandedKeys.has(key)) {
            setUserExpandedKeys(keys => {
                const next = new Set(keys);
                next.delete(key);
                return next;
            });
            setUserCollapsedKeys(keys => new Set(keys).add(key));
            return;
        }
        setUserCollapsedKeys(keys => {
            const next = new Set(keys);
            next.delete(key);
            return next;
        });
        setUserExpandedKeys(keys => new Set(keys).add(key));
    };

    const expandKey = (key: string) => {
        setUserCollapsedKeys(keys => {
            const next = new Set(keys);
            next.delete(key);
            return next;
        });
        setUserExpandedKeys(keys => new Set(keys).add(key));
    };

    return (
        <nav className="zip-sidebar" aria-label="Archive folders">
            {hasFolders ? (
                <TreeNode
                    selected={!currentDir}
                    expanded={expandedKeys.has(ROOT_KEY)}
                    hasChildren
                    depth={0}
                    onToggle={(e) => {
                        e.stopPropagation();
                        toggleKey(ROOT_KEY);
                    }}
                    onSelect={() => onClickFolder(null)}
                    label={<><IconArchive size={14} /><span className="zip-sidebar-root-name">{name}</span></>}
                >
                    <FolderNodes
                        data={folderTree}
                        currentDir={currentDir}
                        expandedKeys={expandedKeys}
                        depth={1}
                        onToggle={toggleKey}
                        onExpand={expandKey}
                        onSelectFolder={onClickFolder}
                    />
                </TreeNode>
            ) : (
                <div className={`zip-tree-row${!currentDir ? ' selected' : ''}`} style={{ paddingLeft: '8px' }}>
                    <span className="zip-tree-toggle invisible" aria-hidden="true" />
                    <button type="button" className="zip-tree-label" onClick={() => onClickFolder(null)}>
                        <IconArchive size={14} />
                        <span className="zip-sidebar-root-name">{name}</span>
                    </button>
                </div>
            )}
        </nav>
    );
}
