import type { MouseEvent, ReactNode } from 'react';
import { Typography } from 'antd';
import type { GitCommit, GitCommitRemote } from '../types';
import type { GraphConfig } from '../graph/layoutEngine';
import {
    getCheckedOutBranchLabel,
    isActiveBranchRef,
    isActiveTagRef,
} from '../util/refHighlight';
import { getBranchLabels } from '../util/branchLabels';
import GraphSvg from './GraphSvg';
import { BranchRefIcon, StashRefIcon, TagRefIcon } from './RefIcons';

const { Text } = Typography;

const UNCOMMITTED = '*';

export type RefContextType = 'head' | 'tag' | 'remote' | 'stash';

interface CommitTableProps {
    commits: GitCommit[];
    branchHead: string | null;
    commitHead: string | null;
    selectedIndex: number | null;
    findMatchIndex: number | null;
    rowHeight: number;
    graphConfig: GraphConfig;
    fileHistoryMode?: boolean;
    onSelect: (index: number, event?: MouseEvent) => void;
    onRowContextMenu: (event: MouseEvent, commit: GitCommit, index: number) => void;
    onRefContextMenu: (
        event: MouseEvent,
        commit: GitCommit,
        refType: RefContextType,
        refName: string,
        remote?: GitCommitRemote,
    ) => void;
}

function formatDate(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleString();
}

function abbrevHash(hash: string): string {
    return hash === '*' ? '*' : hash.substring(0, 7);
}

function stopContextMenu(event: MouseEvent, handler: () => void): void {
    event.preventDefault();
    event.stopPropagation();
    handler();
}

function RefLabel({
    kind,
    name,
    remoteNames,
    active,
    className,
    onContextMenu,
    onRemoteContextMenu,
}: {
    kind: 'head' | 'tag' | 'remote' | 'stash';
    name: string;
    remoteNames?: string[];
    active?: boolean;
    className: string;
    onContextMenu: (event: MouseEvent) => void;
    onRemoteContextMenu?: (event: MouseEvent, remoteName: string) => void;
}) {
    const Icon = kind === 'tag' ? TagRefIcon : kind === 'stash' ? StashRefIcon : BranchRefIcon;
    return (
        <span
            className={`git-graph-ref ${className}${active ? ' active' : ''}`}
            onContextMenu={onContextMenu}
        >
            <span className="git-graph-ref-icon" aria-hidden>
                <Icon />
            </span>
            <span className="git-graph-ref-name">{name}</span>
            {remoteNames?.map((remoteName) => (
                <span
                    key={remoteName}
                    className="git-graph-ref-remote-name"
                    onContextMenu={(event) => {
                        if (!onRemoteContextMenu) return;
                        event.preventDefault();
                        event.stopPropagation();
                        onRemoteContextMenu(event, remoteName);
                    }}
                >
                    {remoteName}
                </span>
            ))}
        </span>
    );
}

function RefTags({
    commit,
    branchHead,
    commitHead,
    onRefContextMenu,
}: {
    commit: GitCommit;
    branchHead: string | null;
    commitHead: string | null;
    onRefContextMenu: CommitTableProps['onRefContextMenu'];
}) {
    const tags: ReactNode[] = [];
    const activeBranches: ReactNode[] = [];
    const inactiveBranches: ReactNode[] = [];
    const branchLabels = getBranchLabels(commit.heads, commit.remotes);

    for (const branch of branchLabels.heads) {
        const isActive = isActiveBranchRef(branch.name, branchHead);
        const ref = (
            <RefLabel
                key={`h-${branch.name}`}
                kind="head"
                name={branch.name}
                remoteNames={branch.remotes.length > 0 ? branch.remotes : undefined}
                active={isActive}
                className="git-graph-ref-head"
                onContextMenu={(e) => stopContextMenu(e, () => onRefContextMenu(e, commit, 'head', branch.name))}
                onRemoteContextMenu={(e, remoteName) => stopContextMenu(e, () => {
                    const remoteRef = commit.remotes.find((item) => item.name === `${remoteName}/${branch.name}`);
                    onRefContextMenu(
                        e,
                        commit,
                        'remote',
                        remoteRef?.name ?? `${remoteName}/${branch.name}`,
                        remoteRef,
                    );
                })}
            />
        );
        if (isActive) {
            activeBranches.push(ref);
        } else {
            inactiveBranches.push(ref);
        }
    }
    for (const ref of activeBranches) {
        tags.push(ref);
    }
    for (const ref of inactiveBranches) {
        tags.push(ref);
    }

    for (const tag of commit.tags) {
        const isActive = isActiveTagRef(tag.name, branchHead, commit.hash, commitHead);
        tags.push(
            <RefLabel
                key={`t-${tag.name}`}
                kind="tag"
                name={tag.name}
                active={isActive}
                className="git-graph-ref-tag"
                onContextMenu={(e) => stopContextMenu(e, () => onRefContextMenu(e, commit, 'tag', tag.name))}
            />
        );
    }
    for (const remote of branchLabels.remotes) {
        tags.push(
            <RefLabel
                key={`r-${remote.name}`}
                kind="remote"
                name={remote.name}
                className="git-graph-ref-remote"
                onContextMenu={(e) => stopContextMenu(e, () => onRefContextMenu(e, commit, 'remote', remote.name, remote))}
            />
        );
    }
    if (commit.stash) {
        tags.push(
            <RefLabel
                key="stash"
                kind="stash"
                name="stash"
                className="git-graph-ref-stash"
                onContextMenu={(e) => stopContextMenu(e, () => onRefContextMenu(e, commit, 'stash', commit.stash!.selector))}
            />
        );
    }
    return <>{tags}</>;
}

function CommitHeadDot({
    commit,
    branchHead,
    commitHead,
}: {
    commit: GitCommit;
    branchHead: string | null;
    commitHead: string | null;
}) {
    if (commitHead === null || commit.hash !== commitHead) {
        return null;
    }
    const checkedOutBranch = getCheckedOutBranchLabel(branchHead);
    const title = checkedOutBranch !== null
        ? `The branch "${checkedOutBranch}" is currently checked out at this commit.`
        : 'This commit is currently checked out.';
    return <span className="git-graph-commit-head-dot" title={title} />;
}

export default function CommitTable({
    commits, branchHead, commitHead, selectedIndex, findMatchIndex, rowHeight, graphConfig,
    fileHistoryMode = false, onSelect, onRowContextMenu, onRefContextMenu,
}: CommitTableProps) {
    return (
        <div className="git-graph-table-wrapper">
            <div className="git-graph-graph-col">
                <div className="git-graph-graph-header">Graph</div>
                <GraphSvg
                    commits={commits}
                    commitHead={commitHead}
                    rowHeight={rowHeight}
                    selectedIndex={selectedIndex}
                    graphConfig={graphConfig}
                    linearFileHistory={fileHistoryMode}
                    onSelect={onSelect}
                />
            </div>
            <div className="git-graph-commits-col">
                <div className="git-graph-table-header">
                    <span className="col-desc">Message</span>
                    <span className="col-date">Date</span>
                    <span className="col-author">Author</span>
                    <span className="col-hash">Hash</span>
                </div>
                <div className="git-graph-table-body">
                    {commits.map((commit, index) => (
                        <div
                            key={commit.hash + index}
                            data-commit-index={index}
                            className={`git-graph-row${selectedIndex === index ? ' selected' : ''}${findMatchIndex === index ? ' find-match' : ''}${commitHead !== null && commit.hash === commitHead ? ' current-head' : ''}${commit.hash === UNCOMMITTED ? ' uncommitted' : ''}`}
                            style={{ height: rowHeight }}
                            onClick={(e) => onSelect(index, e)}
                            onContextMenu={(e) => onRowContextMenu(e, commit, index)}
                        >
                            <span className="col-desc">
                                <CommitHeadDot
                                    commit={commit}
                                    branchHead={branchHead}
                                    commitHead={commitHead}
                                />
                                <RefTags
                                    commit={commit}
                                    branchHead={branchHead}
                                    commitHead={commitHead}
                                    onRefContextMenu={onRefContextMenu}
                                />
                                <Text ellipsis className={`git-graph-message${commit.hash === UNCOMMITTED ? ' git-graph-message-uncommitted' : ''}`}>{commit.message}</Text>
                            </span>
                            <span className="col-date">
                                <Text ellipsis className="git-graph-muted">{formatDate(commit.date)}</Text>
                            </span>
                            <span className="col-author">
                                <Text ellipsis className="git-graph-muted">{commit.author}</Text>
                            </span>
                            <span className="col-hash">
                                <code className="git-graph-hash">{abbrevHash(commit.hash)}</code>
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
