import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { IconArchive, IconChevronDown, IconChevronRight } from '../icons';
import { FileTypeIcon } from './FileTypeIcon';
import { FileInfo } from '../zipTypes';

interface SidebarProps {
    name?: string;
    folderMap?: Record<string, FileInfo>;
    currentDir: string;
    onClickFolder: (entryName: string | null) => void;
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
        nodes.push(
            <TreeNode
                key={key}
                selected={currentDir === key}
                expanded={expandedKeys.has(key)}
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
                label={<><FileTypeIcon name={item.name} isDirectory /><span>{item.name}</span></>}
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

export default function Sidebar({ name = '', folderMap, currentDir, onClickFolder }: SidebarProps) {
    const rootKey = useRef('zip_sidebar_root');
    const folderTree = useMemo(() => buildFolderTree(folderMap ?? {}), [folderMap]);
    const hasFolders = folderTree.length > 0;
    const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => new Set());

    useEffect(() => {
        if (!hasFolders) {
            setExpandedKeys(new Set());
            return;
        }
        setExpandedKeys(keys => {
            const next = new Set(keys);
            next.add(rootKey.current);
            return next;
        });
    }, [hasFolders]);

    useEffect(() => {
        if (!currentDir || !hasFolders) return;
        setExpandedKeys(keys => {
            const next = new Set(keys);
            next.add(rootKey.current);
            next.add(currentDir);
            const parts = currentDir.split('/');
            let acc = '';
            for (const part of parts) {
                acc = acc ? `${acc}/${part}` : part;
                next.add(acc);
            }
            return next;
        });
    }, [currentDir, hasFolders]);

    const toggleKey = (key: string) => {
        setExpandedKeys(keys => {
            const next = new Set(keys);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const expandKey = (key: string) => {
        setExpandedKeys(keys => {
            if (keys.has(key)) return keys;
            const next = new Set(keys);
            next.add(key);
            return next;
        });
    };

    return (
        <nav className="zip-sidebar" aria-label="Archive folders">
            {hasFolders ? (
                <TreeNode
                    selected={!currentDir}
                    expanded={expandedKeys.has(rootKey.current)}
                    hasChildren
                    depth={0}
                    onToggle={(e) => {
                        e.stopPropagation();
                        toggleKey(rootKey.current);
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
