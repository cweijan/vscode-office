import { useMemo, useState } from 'react';
import type { MouseEvent } from 'react';
import type { GitFileChange } from '../types';
import { fileTouchesPath } from '../util/repoPath';
import {
    buildOpenFileAction,
    buildViewDiffAction,
    buildViewFileAtRevisionAction,
    canOpenWorkingFile,
    canViewFileAtRevision,
    canViewFileDiff,
} from '../util/fileChangeActions';
import {
    buildFileTree,
    collectFolderPaths,
    FILE_CHANGE_STATUS_CLASS,
    getChangeDisplayPath,
    sortFlatFileChanges,
    type FileTreeNode,
    type FileViewMode,
} from '../util/commitFileTree';
import { FileTypeIcon } from '../../components/FileTypeIcon';
import { FolderTreeIcon } from './FileTreeIcons';
import {
    folderRowPaddingLeft,
    fileRowPaddingLeft,
    getChangeIconPath,
} from '../util/fileIcon';

export type FileChangeActionPayload = Record<string, unknown> & { action: string };

const FILE_CHANGE_BADGE_LABEL: Record<string, string> = {
    A: 'A',
    R: 'R',
};

interface CommitDetailFileViewProps {
    repo: string;
    commitHash: string;
    hasParents: boolean;
    fileChanges: GitFileChange[];
    relPath?: string | null;
    viewMode: FileViewMode;
    onFileAction: (payload: FileChangeActionPayload) => void;
    onFileContextMenu: (event: MouseEvent, change: GitFileChange) => void;
}

function FileStats({ change }: { change: GitFileChange }) {
    const additions = change.additions ?? 0;
    const deletions = change.deletions ?? 0;
    if (additions <= 0 && deletions <= 0) {
        return null;
    }
    return (
        <span className="git-graph-cdv-file-stats">
            {additions > 0 && (
                <span className="git-graph-status-added">+{additions}</span>
            )}
            {deletions > 0 && (
                <span className="git-graph-status-deleted">-{deletions}</span>
            )}
        </span>
    );
}

function FileChangeRow({
    change,
    label,
    title,
    relPath,
    depth,
    repo,
    commitHash,
    hasParents,
    onFileAction,
    onContextMenu,
}: {
    change: GitFileChange;
    label: string;
    title: string;
    relPath?: string | null;
    depth: number;
    repo: string;
    commitHash: string;
    hasParents: boolean;
    onFileAction: (payload: FileChangeActionPayload) => void;
    onContextMenu: (event: MouseEvent, change: GitFileChange) => void;
}) {
    const statusClass = FILE_CHANGE_STATUS_CLASS[change.type] ?? '';
    const badgeLabel = FILE_CHANGE_BADGE_LABEL[change.type];
    const isCurrent = Boolean(
        relPath && fileTouchesPath(relPath, change.oldFilePath, change.newFilePath),
    );
    const iconPath = getChangeIconPath(change);
    const diffPossible = canViewFileDiff(change);
    const showRevision = canViewFileAtRevision(change);
    const showOpen = canOpenWorkingFile(change);

    const handleRowClick = (event: MouseEvent<HTMLDivElement>) => {
        if ((event.target as HTMLElement).closest('.git-graph-cdv-file-action-btn')) {
            return;
        }
        if (!diffPossible) {
            return;
        }
        onFileAction(buildViewDiffAction(repo, commitHash, hasParents, change));
    };

    return (
        <div
            className={`git-graph-cdv-file-row${statusClass ? ` ${statusClass}` : ''}${isCurrent ? ' current' : ''}${diffPossible ? ' diff-possible' : ''}`}
            style={{ paddingLeft: fileRowPaddingLeft(depth) }}
            onClick={handleRowClick}
            onContextMenu={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onContextMenu(event, change);
            }}
        >
            <FileTypeIcon
                name={iconPath.split(/[/\\]/).pop() ?? iconPath}
                className="git-graph-cdv-file-icon"
            />
            <span className="git-graph-cdv-file-name" title={title}>{label}</span>
            {badgeLabel && (
                <span className={`git-graph-cdv-file-badge git-graph-cdv-file-badge-${change.type.toLowerCase()}`} aria-label={`Status ${badgeLabel}`}>
                    {badgeLabel}
                </span>
            )}
            <FileStats change={change} />
            <span className="git-graph-cdv-file-action-spacer" aria-hidden />
            <span className="git-graph-cdv-file-actions">
                {showRevision && (
                    <button
                        type="button"
                        className="git-graph-cdv-file-action-btn"
                        title="View file at this revision"
                        aria-label="View file at this revision"
                        onClick={(event) => {
                            event.stopPropagation();
                            onFileAction(buildViewFileAtRevisionAction(repo, commitHash, change));
                        }}
                    >
                        <span className="codicon codicon-git-commit" aria-hidden />
                    </button>
                )}
                {showOpen && (
                    <button
                        type="button"
                        className="git-graph-cdv-file-action-btn"
                        title="Open current file"
                        aria-label="Open current file"
                        onClick={(event) => {
                            event.stopPropagation();
                            onFileAction(buildOpenFileAction(repo, change));
                        }}
                    >
                        <span className="codicon codicon-go-to-file" aria-hidden />
                    </button>
                )}
            </span>
        </div>
    );
}

function TreeNodes({
    nodes,
    relPath,
    depth,
    expanded,
    repo,
    commitHash,
    hasParents,
    onToggleFolder,
    onFileAction,
    onFileContextMenu,
}: {
    nodes: FileTreeNode[];
    relPath?: string | null;
    depth: number;
    expanded: Set<string>;
    repo: string;
    commitHash: string;
    hasParents: boolean;
    onToggleFolder: (path: string) => void;
    onFileAction: (payload: FileChangeActionPayload) => void;
    onFileContextMenu: (event: MouseEvent, change: GitFileChange) => void;
}) {
    return (
        <>
            {nodes.map((node) => {
                if (node.kind === 'folder') {
                    const isOpen = expanded.has(node.path);
                    return (
                        <div key={node.path || node.name} className="git-graph-cdv-tree-folder">
                            <button
                                type="button"
                                className="git-graph-cdv-folder-row"
                                style={{ paddingLeft: folderRowPaddingLeft(depth) }}
                                onClick={() => onToggleFolder(node.path)}
                            >
                                <FolderTreeIcon isOpen={isOpen} />
                                <span className="git-graph-cdv-folder-name">{node.name}</span>
                            </button>
                            {isOpen && (
                                <TreeNodes
                                    nodes={node.children}
                                    relPath={relPath}
                                    depth={depth + 1}
                                    expanded={expanded}
                                    repo={repo}
                                    commitHash={commitHash}
                                    hasParents={hasParents}
                                    onToggleFolder={onToggleFolder}
                                    onFileAction={onFileAction}
                                    onFileContextMenu={onFileContextMenu}
                                />
                            )}
                        </div>
                    );
                }
                return (
                    <FileChangeRow
                        key={node.displayPath}
                        change={node.change}
                        label={node.name}
                        title={node.displayPath}
                        relPath={relPath}
                        depth={depth}
                        repo={repo}
                        commitHash={commitHash}
                        hasParents={hasParents}
                        onFileAction={onFileAction}
                        onContextMenu={onFileContextMenu}
                    />
                );
            })}
        </>
    );
}

export default function CommitDetailFileView({
    repo, commitHash, hasParents, fileChanges, relPath, viewMode, onFileAction, onFileContextMenu,
}: CommitDetailFileViewProps) {
    const tree = useMemo(() => buildFileTree(fileChanges), [fileChanges]);
    const flatChanges = useMemo(() => sortFlatFileChanges(fileChanges), [fileChanges]);
    const defaultExpanded = useMemo(() => new Set(collectFolderPaths(tree)), [tree]);
    const [userExpanded, setUserExpanded] = useState<Set<string>>(() => new Set());
    const [userCollapsed, setUserCollapsed] = useState<Set<string>>(() => new Set());
    const expanded = useMemo(() => {
        const next = new Set(defaultExpanded);
        for (const path of userExpanded) {
            next.add(path);
        }
        for (const path of userCollapsed) {
            next.delete(path);
        }
        return next;
    }, [defaultExpanded, userCollapsed, userExpanded]);

    const toggleFolder = (path: string) => {
        if (expanded.has(path)) {
            setUserExpanded((prev) => {
                const next = new Set(prev);
                next.delete(path);
                return next;
            });
            setUserCollapsed((prev) => new Set(prev).add(path));
            return;
        }
        setUserCollapsed((prev) => {
            const next = new Set(prev);
            next.delete(path);
            return next;
        });
        setUserExpanded((prev) => new Set(prev).add(path));
    };

    if (viewMode === 'flat') {
        return (
            <div className="git-graph-cdv-file-list">
                {flatChanges.map((change) => {
                    const displayPath = getChangeDisplayPath(change);
                    return (
                        <FileChangeRow
                            key={displayPath}
                            change={change}
                            label={displayPath}
                            title={displayPath}
                            relPath={relPath}
                            depth={0}
                            repo={repo}
                            commitHash={commitHash}
                            hasParents={hasParents}
                            onFileAction={onFileAction}
                            onContextMenu={onFileContextMenu}
                        />
                    );
                })}
            </div>
        );
    }

    return (
        <div className="git-graph-cdv-file-list">
            <TreeNodes
                nodes={tree}
                relPath={relPath}
                depth={0}
                expanded={expanded}
                repo={repo}
                commitHash={commitHash}
                hasParents={hasParents}
                onToggleFolder={toggleFolder}
                onFileAction={onFileAction}
                onFileContextMenu={onFileContextMenu}
            />
        </div>
    );
}
