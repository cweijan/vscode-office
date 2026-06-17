import type { GitCommitData, GitCommitDetailsData, GitRepoInfo } from './git';

export interface GitHistoryReadyPayload {
    readonly repos: ReadonlyArray<string>;
    readonly initialRepo: string | null;
    readonly filePath?: string | null;
    readonly fileName?: string | null;
    readonly relPath?: string | null;
}

export interface LoadRepoInfoPayload {
    readonly repo: string;
    readonly showRemoteBranches: boolean;
    readonly showStashes: boolean;
    readonly invalidateCache?: boolean;
}

export interface LoadCommitsPayload {
    readonly repo: string;
    readonly branches: ReadonlyArray<string> | null;
    readonly maxCommits: number;
    readonly showTags: boolean;
    readonly showRemoteBranches: boolean;
    readonly includeCommitsMentionedByReflogs: boolean;
    readonly onlyFollowFirstParent: boolean;
    readonly commitOrdering: 'date' | 'author-date' | 'topo';
    readonly remotes: ReadonlyArray<string>;
    readonly hideRemotes: ReadonlyArray<string>;
    readonly stashes: ReadonlyArray<import('./git').GitStash>;
    readonly author?: string;
    readonly searchValue?: string;
    readonly relPath?: string;
}

export interface CommitDetailsPayload {
    readonly repo: string;
    readonly commitHash: string;
    readonly hasParents: boolean;
}

export type { GitActionPayload, GitActionResult } from './gitActions';

export type GitHistoryExtensionEvents =
    | { type: 'ready' }
    | { type: 'loadRepoInfo'; content: LoadRepoInfoPayload }
    | { type: 'loadCommits'; content: LoadCommitsPayload }
    | { type: 'commitDetails'; content: CommitDetailsPayload }
    | { type: 'refresh' };

export type GitHistoryWebviewEvents =
    | { type: 'init'; content: GitHistoryReadyPayload }
    | { type: 'repoInfo'; content: GitRepoInfo }
    | { type: 'commits'; content: GitCommitData }
    | { type: 'commitDetails'; content: GitCommitDetailsData }
    | { type: 'refresh' }
    | { type: 'error'; content: string };
