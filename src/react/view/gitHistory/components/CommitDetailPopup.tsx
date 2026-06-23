import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Empty, Spin, Typography } from 'antd';
import type { MouseEvent } from 'react';
import type { GitCommit, GitCommitDetails, GitFileChange } from '../types';
import { fileTouchesPath } from '../util/repoPath';
import {
    COMMIT_DETAIL_POPUP_WIDTH,
    computeCommitDetailPopupPosition,
    getViewportBounds,
    type CommitDetailPopupLayout,
    type PopupAnchor,
} from '../util/commitDetailPopup';
import type { FileViewMode } from '../util/commitFileTree';
import CommitDetailFileView from './CommitDetailFileView';

const { Text } = Typography;
const COMMIT_INFO_POPUP_WIDTH = 480;

interface CommitDetailPopupProps {
    anchor: PopupAnchor;
    containerRef: RefObject<HTMLElement | null>;
    repo: string;
    commit: GitCommit;
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

function abbrevHash(hash: string): string {
    return hash === '*' ? '*' : hash.substring(0, 10);
}

function normalizeHref(url: string): string {
    return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function getCommitBody(details: GitCommitDetails, subject: string): string {
    const message = details.body.trim();
    if (!message || message === subject) {
        return '';
    }
    const lines = message.split(/\r?\n/);
    if (lines[0] === subject) {
        return lines.slice(1).join('\n').trim();
    }
    return message;
}

function PersonValue({ name, email }: { name: string; email: string }) {
    if (!name && !email) {
        return <span className="git-graph-cdv-detail-empty">-</span>;
    }
    return (
        <>
            {name && <span>{name}</span>}
            {name && email && ' '}
            {email && <span>&lt;</span>}
            {email && (
                <a className="git-graph-cdv-email-link" href={`mailto:${email}`}>
                    {email}
                </a>
            )}
            {email && <span>&gt;</span>}
        </>
    );
}

function LinkifiedCommitBody({ text }: { text: string }) {
    const nodes: ReactNode[] = [];
    const urlInParens = /(\()((?:https?:\/\/|www\.)[^\s)]+)(\))/gi;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = urlInParens.exec(text)) !== null) {
        const [fullMatch, openParen, url, closeParen] = match;
        if (match.index > lastIndex) {
            nodes.push(text.slice(lastIndex, match.index));
        }
        nodes.push(openParen);
        nodes.push(
            <a
                key={`${match.index}-${url}`}
                className="git-graph-cdv-detail-link"
                href={normalizeHref(url)}
                target="_blank"
                rel="noreferrer"
            >
                {url}
            </a>,
        );
        nodes.push(closeParen);
        lastIndex = match.index + fullMatch.length;
    }

    if (lastIndex < text.length) {
        nodes.push(text.slice(lastIndex));
    }

    return <>{nodes}</>;
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

function CommitInfoPanel({
    commit,
    details,
    fileChanges,
}: {
    commit: GitCommit;
    details: GitCommitDetails;
    fileChanges: GitFileChange[];
}) {
    const additions = fileChanges.reduce((sum, change) => sum + (change.additions ?? 0), 0);
    const deletions = fileChanges.reduce((sum, change) => sum + (change.deletions ?? 0), 0);
    const body = getCommitBody(details, commit.message);

    return (
        <div className="git-graph-cdv-detail-panel">
            <div className="git-graph-cdv-detail-message git-graph-cdv-detail-message-top">
                <div className="git-graph-cdv-detail-label">Message</div>
                <div className="git-graph-cdv-detail-subject">{commit.message}</div>
            </div>
            <div className="git-graph-cdv-detail-grid">
                <div className="git-graph-cdv-detail-label">Commit</div>
                <code
                    className="git-graph-cdv-detail-value git-graph-cdv-detail-hash"
                    title={details.hash}
                >
                    {abbrevHash(details.hash)}
                </code>
                <div className="git-graph-cdv-detail-label">Date</div>
                <div className="git-graph-cdv-detail-value">{formatLongDate(details.committerDate)}</div>
                <div className="git-graph-cdv-detail-label">Files</div>
                <div className="git-graph-cdv-detail-value">
                    {fileChanges.length} changed
                    <span className="git-graph-status-added"> +{additions}</span>
                    <span className="git-graph-status-deleted"> -{deletions}</span>
                </div>
                <div className="git-graph-cdv-detail-label">Author</div>
                <div className="git-graph-cdv-detail-value">
                    <PersonValue name={details.author} email={details.authorEmail} />
                </div>
            </div>
            {body && (
                <div className="git-graph-cdv-detail-message git-graph-cdv-detail-body-section">
                    <div className="git-graph-cdv-detail-label">Details</div>
                    <div className="git-graph-cdv-detail-body"><LinkifiedCommitBody text={body} /></div>
                </div>
            )}
        </div>
    );
}

export default function CommitDetailPopup({
    anchor, containerRef, repo, commit, commitHash, hasParents, details, loading, error, relPath, filterCurrentFile,
    onClose, onToggleFilterCurrentFile, onFileAction, onFileContextMenu,
}: CommitDetailPopupProps) {
    const popupRef = useRef<HTMLDivElement>(null);
    const [fileViewMode, setFileViewMode] = useState<FileViewMode>('tree');
    const [detailViewMode, setDetailViewMode] = useState<'files' | 'commit'>('files');
    const popupWidth = detailViewMode === 'commit' ? COMMIT_INFO_POPUP_WIDTH : COMMIT_DETAIL_POPUP_WIDTH;
    const [layout, setLayout] = useState<CommitDetailPopupLayout>(() => {
        const bounds = getViewportBounds();
        return computeCommitDetailPopupPosition(anchor, 280, popupWidth, bounds);
    });

    const fileChanges = details ? filterFileChanges(details, relPath, filterCurrentFile) : [];

    useLayoutEffect(() => {
        const popup = popupRef.current;
        const container = containerRef.current;
        if (!popup) {
            return;
        }

        const reposition = () => {
            const bounds = getViewportBounds(container);
            popup.style.maxHeight = '';
            popup.style.height = 'auto';

            const naturalHeight = popup.getBoundingClientRect().height || 280;
            const provisional = computeCommitDetailPopupPosition(
                anchor,
                naturalHeight,
                popupWidth,
                bounds,
            );
            const height = Math.min(naturalHeight, provisional.maxHeight);
            const nextLayout = computeCommitDetailPopupPosition(
                anchor,
                height,
                popupWidth,
                bounds,
            );
            setLayout({ ...nextLayout, height });
        };

        reposition();

        const observer = typeof ResizeObserver !== 'undefined'
            ? new ResizeObserver(reposition)
            : null;
        if (observer && container) {
            observer.observe(container);
        }
        window.addEventListener('resize', reposition);
        return () => {
            observer?.disconnect();
            window.removeEventListener('resize', reposition);
        };
    }, [anchor, containerRef, loading, error, details, filterCurrentFile, relPath, fileViewMode, detailViewMode, popupWidth]);

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
    } else if (detailViewMode === 'commit') {
        body = (
            <CommitInfoPanel
                commit={commit}
                details={details}
                fileChanges={fileChanges}
            />
        );
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
                        <span className="git-graph-cdv-author">{details.author}</span>
                        <span className="git-graph-cdv-date">{formatLongDate(details.authorDate)}</span>
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
            style={{
                left: layout.left,
                top: layout.top,
                width: popupWidth,
                maxHeight: layout.maxHeight,
                height: layout.height,
            }}
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
                    className="git-graph-icon-btn"
                    title={detailViewMode === 'commit'
                        ? 'Show changed files'
                        : fileViewMode === 'tree' ? 'Show files as list' : 'Show files as tree'}
                    onClick={() => {
                        if (detailViewMode === 'commit') {
                            setDetailViewMode('files');
                            return;
                        }
                        setFileViewMode((mode) => (mode === 'tree' ? 'flat' : 'tree'));
                    }}
                >
                    <span
                        className={`codicon codicon-${fileViewMode === 'tree' ? 'list-flat' : 'list-tree'}`}
                        aria-hidden
                    />
                </button>
                <button
                    type="button"
                    className={`git-graph-icon-btn${detailViewMode === 'commit' ? ' active' : ''}`}
                    title={detailViewMode === 'commit' ? 'Show changed files' : 'Show commit details'}
                    onClick={() => setDetailViewMode((mode) => (mode === 'commit' ? 'files' : 'commit'))}
                >
                    <span className="codicon codicon-git-commit" aria-hidden />
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
