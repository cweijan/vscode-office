import { useLayoutEffect, useRef, useState } from 'react';
import { Empty, Spin, Typography } from 'antd';
import type { MouseEvent } from 'react';
import type { GitCommitDetails, GitFileChange } from '../types';
import { fileTouchesPath } from '../util/repoPath';
import {
    COMMIT_DETAIL_POPUP_WIDTH,
    computeCommitDetailPopupPosition,
    type PopupAnchor,
} from '../util/commitDetailPopup';
import type { FileViewMode } from '../util/commitFileTree';
import CommitDetailFileView from './CommitDetailFileView';

const { Text } = Typography;

interface CommitDetailPopupProps {
    anchor: PopupAnchor;
    repo: string;
    commitHash: string;
    hasParents: boolean;
    details: GitCommitDetails | null;
    loading: boolean;
    error: string | null;
    relPath?: string | null;
    filterCurrentFile: boolean;
    onClose: () => void;
    onToggleFilterCurrentFile: () => void;
    onFileAction: (action: Record<string, unknown> & { action: string }) => void;
    onFileContextMenu: (event: MouseEvent, change: GitFileChange) => void;
}

function formatLongDate(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleString();
}

function filterFileChanges(
    details: GitCommitDetails,
    relPath: string | null | undefined,
    filterCurrentFile: boolean,
): GitFileChange[] {
    if (!filterCurrentFile || !relPath) {
        return details.fileChanges;
    }
    const filtered: GitFileChange[] = [];
    for (const change of details.fileChanges) {
        if (fileTouchesPath(relPath, change.oldFilePath, change.newFilePath)) {
            filtered.push(change);
        }
    }
    return filtered;
}

export default function CommitDetailPopup({
    anchor, repo, commitHash, hasParents, details, loading, error, relPath, filterCurrentFile,
    onClose, onToggleFilterCurrentFile, onFileAction, onFileContextMenu,
}: CommitDetailPopupProps) {
    const popupRef = useRef<HTMLDivElement>(null);
    const [fileViewMode, setFileViewMode] = useState<FileViewMode>('tree');
    const [position, setPosition] = useState(() =>
        computeCommitDetailPopupPosition(anchor, 280),
    );

    const fileChanges = details ? filterFileChanges(details, relPath, filterCurrentFile) : [];

    useLayoutEffect(() => {
        const height = popupRef.current?.offsetHeight ?? 280;
        setPosition(computeCommitDetailPopupPosition(anchor, height));
    }, [anchor, loading, error, details, filterCurrentFile, relPath, fileViewMode]);

    let body;
    if (loading) {
        body = (
            <div className="git-graph-cdv-loading">
                <Spin size="small" />
                <span>Loading commit details...</span>
            </div>
        );
    } else if (error) {
        body = <Text className="git-graph-status-deleted">{error}</Text>;
    } else if (!details) {
        body = <Empty description="No commit details" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
    } else {
        body = (
            <>
                <div className="git-graph-cdv-summary">
                    {details.body && (
                        <div
                            className="git-graph-cdv-body"
                            title={details.body}
                        >
                            {details.body.split(/\r?\n/)[0]}
                        </div>
                    )}
                    <div className="git-graph-cdv-meta">
                        <span>{details.author}</span>
                        <span className="git-graph-muted">{formatLongDate(details.authorDate)}</span>
                    </div>
                </div>
                <div className="git-graph-cdv-files">
                    {relPath && filterCurrentFile && fileChanges.length === 0 ? (
                        <Empty
                            description="This file was not changed in the selected commit"
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                        />
                    ) : (
                        <CommitDetailFileView
                            repo={repo}
                            commitHash={commitHash}
                            hasParents={hasParents}
                            fileChanges={fileChanges}
                            relPath={relPath}
                            viewMode={fileViewMode}
                            onFileAction={onFileAction}
                            onFileContextMenu={onFileContextMenu}
                        />
                    )}
                </div>
            </>
        );
    }

    return (
        <div
            ref={popupRef}
            className="git-graph-cdv"
            style={{ left: position.left, top: position.top, width: COMMIT_DETAIL_POPUP_WIDTH }}
            onMouseDown={(e) => e.stopPropagation()}
        >
            <div className="git-graph-cdv-main">
                <div className="git-graph-cdv-content">{body}</div>
            </div>
            <div className="git-graph-cdv-controls">
                <button type="button" className="git-graph-icon-btn" title="Close (Escape)" onClick={onClose}>
                    <span className="codicon codicon-close" aria-hidden />
                </button>
                <button
                    type="button"
                    className={`git-graph-icon-btn${fileViewMode === 'tree' ? ' active' : ''}`}
                    title={fileViewMode === 'tree' ? 'Show files as list' : 'Show files as tree'}
                    onClick={() => setFileViewMode((mode) => (mode === 'tree' ? 'flat' : 'tree'))}
                >
                    <span
                        className={`codicon codicon-${fileViewMode === 'tree' ? 'list-flat' : 'list-tree'}`}
                        aria-hidden
                    />
                </button>
                {relPath && (
                    <button
                        type="button"
                        className={`git-graph-icon-btn${filterCurrentFile ? ' active' : ''}`}
                        title="Show only changes to the current file"
                        onClick={onToggleFilterCurrentFile}
                    >
                        <span className="codicon codicon-file" aria-hidden />
                    </button>
                )}
            </div>
        </div>
    );
}
