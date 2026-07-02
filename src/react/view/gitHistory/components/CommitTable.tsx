import { useMemo, useState } from 'react';
import type { MouseEvent, ReactNode, CSSProperties } from 'react';
import { Typography } from 'antd';
import type { GitCommit, GitCommitRemote } from '../types';
import type { GraphConfig } from '../graph/layoutEngine';
import { computeGraphLayout } from '../graph/layoutEngine';
import {
    getCheckedOutBranchLabel,
    isActiveBranchRef,
    isActiveTagRef,
} from '../util/refHighlight';
import { getBranchLabels } from '../util/branchLabels';
import { formatCommitDate } from '../util/formatCommitDate';
import { getVertexColour } from '../util/graphColours';
import GraphSvg from './GraphSvg';
import { BranchRefIcon, StashRefIcon, TagRefIcon } from './RefIcons';

const { Text } = Typography;

const UNCOMMITTED = '*';

export type RefContextType = 'head' | 'tag' | 'remote' | 'stash';

interface CommitTableProps {
    commits: GitCommit[];
    branchHead: string | null;
    commitHead: string | null;
    selectedIndices: ReadonlySet<number>;
    focusIndex: number | null;
    findMatchIndex: number | null;
    rowHeight: number;
    graphConfig: GraphConfig;
    fileHistoryMode?: boolean;
    dimOffCurrentBranch?: boolean;
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
    branchHead,
    commitHead,
    commitHash,
}: {
    branchHead: string | null;
    commitHead: string | null;
    commitHash: string;
}) {
    if (commitHead === null || commitHash !== commitHead) {
        return null;
    }
    const checkedOutBranch = getCheckedOutBranchLabel(branchHead);
    const title = checkedOutBranch !== null
        ? `The branch "${checkedOutBranch}" is currently checked out at this commit.`
        : 'This commit is currently checked out.';
    return <span className="git-graph-commit-head-dot" title={title} />;
}

export default function CommitTable({
    commits, branchHead, commitHead, selectedIndices, focusIndex, findMatchIndex, rowHeight, graphConfig,
    fileHistoryMode = false, dimOffCurrentBranch = false, onSelect, onRowContextMenu, onRefContextMenu,
}: CommitTableProps) {
    const multiSelect = selectedIndices.size > 1;
    const [renderTime] = useState(() => Date.now());
    const formattedDates = useMemo(() => {
        const dates: string[] = [];
        for (let i = 0; i < commits.length; i++) {
            dates.push(formatCommitDate(commits[i].date, renderTime));
        }
        return dates;
    }, [commits, renderTime]);
    const layout = useMemo(
        () => computeGraphLayout(
            commits,
            commitHead,
            rowHeight,
            graphConfig,
            false,
            fileHistoryMode,
            false,
        ),
        [commits, commitHead, rowHeight, graphConfig, fileHistoryMode],
    );

    return (
        <div className="git-graph-table-wrapper">
            <div className="git-graph-graph-col">
                <div className="git-graph-graph-header">Graph</div>
                <GraphSvg
                    layout={layout}
                    selectedIndices={selectedIndices}
                    focusIndex={focusIndex}
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
                    {commits.map((commit, index) => {
                        const isSelected = selectedIndices.has(index);
                        const rowClass = [
                            'git-graph-row',
                            isSelected && multiSelect ? 'multi-selected' : '',
                            isSelected && !multiSelect ? 'selected' : '',
                            isSelected && multiSelect && focusIndex === index ? 'selection-focus' : '',
                            findMatchIndex === index ? 'find-match' : '',
                            commitHead !== null && commit.hash === commitHead ? 'current-head' : '',
                            commit.hash === UNCOMMITTED ? 'uncommitted' : '',
                            commit.onCurrentBranch === false && dimOffCurrentBranch ? 'off-current-branch' : '',
                        ].filter(Boolean).join(' ');
                        const rowStyle = {
                            height: rowHeight,
                            '--git-graph-color': getVertexColour(layout.vertexColors, graphConfig.colours, index),
                        } as CSSProperties;
                        return (
                        <div
                            key={commit.hash + index}
                            data-commit-index={index}
                            data-color={layout.vertexColors[index] ?? 0}
                            className={rowClass}
                            style={rowStyle}
                            onMouseDown={(e) => {
                                if (e.shiftKey || e.metaKey || e.ctrlKey) {
                                    e.preventDefault();
                                }
                            }}
                            onClick={(e) => onSelect(index, e)}
                            onContextMenu={(e) => onRowContextMenu(e, commit, index)}
                        >
                            <span className="col-desc">
                                <CommitHeadDot
                                    branchHead={branchHead}
                                    commitHead={commitHead}
                                    commitHash={commit.hash}
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
                                <Text ellipsis className="git-graph-muted">{formattedDates[index]}</Text>
                            </span>
                            <span className="col-author">
                                <Text ellipsis className="git-graph-muted">{commit.author}</Text>
                            </span>
                            <span className="col-hash">
                                <code className="git-graph-hash">{abbrevHash(commit.hash)}</code>
                            </span>
                        </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
