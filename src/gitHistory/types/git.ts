export const UNCOMMITTED = '*';

export interface GitCommitTag {
    readonly name: string;
    readonly annotated: boolean;
}

export interface GitCommitRemote {
    readonly name: string;
    readonly remote: string | null;
}

export interface GitCommitStash {
    readonly selector: string;
    readonly baseHash: string;
    readonly untrackedFilesHash: string | null;
}

export interface GitCommit {
    readonly hash: string;
    readonly parents: ReadonlyArray<string>;
    readonly author: string;
    readonly email: string;
    readonly date: number;
    readonly message: string;
    readonly heads: ReadonlyArray<string>;
    readonly tags: ReadonlyArray<GitCommitTag>;
    readonly remotes: ReadonlyArray<GitCommitRemote>;
    readonly stash: GitCommitStash | null;
}

export type GitFileStatus = 'A' | 'M' | 'D' | 'R' | 'U';

export interface GitFileChange {
    readonly oldFilePath: string;
    readonly newFilePath: string;
    readonly type: GitFileStatus;
    readonly additions: number | null;
    readonly deletions: number | null;
}

export interface GitCommitDetails {
    readonly hash: string;
    readonly parents: ReadonlyArray<string>;
    readonly author: string;
    readonly authorEmail: string;
    readonly authorDate: number;
    readonly committer: string;
    readonly committerEmail: string;
    readonly committerDate: number;
    readonly body: string;
    readonly fileChanges: ReadonlyArray<GitFileChange>;
}

export interface GitStash {
    readonly hash: string;
    readonly baseHash: string;
    readonly untrackedFilesHash: string | null;
    readonly selector: string;
    readonly author: string;
    readonly email: string;
    readonly date: number;
    readonly message: string;
}

export interface GitRepoInfo {
    readonly branches: ReadonlyArray<string>;
    readonly head: string | null;
    readonly remotes: ReadonlyArray<string>;
    readonly stashes: ReadonlyArray<GitStash>;
    readonly authors: ReadonlyArray<string>;
    readonly hasRemoteUrl: boolean;
    readonly remoteWebUrls: ReadonlyArray<{ readonly name: string; readonly url: string }>;
    readonly error: string | null;
}

export interface GitCommitData {
    readonly commits: ReadonlyArray<GitCommit>;
    readonly head: string | null;
    readonly tags: ReadonlyArray<string>;
    readonly moreCommitsAvailable: boolean;
    readonly relPath?: string | null;
    readonly error: string | null;
}

export interface GitCommitDetailsData {
    readonly commitDetails: GitCommitDetails | null;
    readonly error: string | null;
}

export type CommitOrdering = 'date' | 'author-date' | 'topo';

export interface LoadCommitsRequest {
    readonly repo: string;
    readonly branches: ReadonlyArray<string> | null;
    readonly maxCommits: number;
    readonly showTags: boolean;
    readonly showRemoteBranches: boolean;
    readonly includeCommitsMentionedByReflogs: boolean;
    readonly onlyFollowFirstParent: boolean;
    readonly commitOrdering: CommitOrdering;
    readonly remotes: ReadonlyArray<string>;
    readonly hideRemotes: ReadonlyArray<string>;
    readonly stashes: ReadonlyArray<GitStash>;
    readonly author?: string;
    readonly searchValue?: string;
    readonly relPath?: string;
}

export interface LoadRepositoryRequest {
    readonly repo: string;
    readonly showRemoteBranches: boolean;
    readonly showStashes: boolean;
    readonly branches: ReadonlyArray<string> | null;
    readonly maxCommits: number;
    readonly showTags: boolean;
    readonly includeCommitsMentionedByReflogs: boolean;
    readonly onlyFollowFirstParent: boolean;
    readonly commitOrdering: CommitOrdering;
    readonly hideRemotes: ReadonlyArray<string>;
    readonly author?: string;
    readonly searchValue?: string;
    readonly relPath?: string;
}

export interface LoadRepositoryResult {
    readonly repoInfo: GitRepoInfo;
    readonly commitData: GitCommitData;
}

export interface GitCommitRecord {
    readonly hash: string;
    readonly parents: ReadonlyArray<string>;
    readonly author: string;
    readonly email: string;
    readonly date: number;
    readonly message: string;
}

export interface GitRefHead {
    readonly hash: string;
    readonly name: string;
}

export interface GitRefTag {
    readonly hash: string;
    readonly name: string;
    readonly annotated: boolean;
}

export interface GitRefRemote {
    readonly hash: string;
    readonly name: string;
}

export interface GitRefData {
    readonly head: string | null;
    readonly heads: ReadonlyArray<GitRefHead>;
    readonly tags: ReadonlyArray<GitRefTag>;
    readonly remotes: ReadonlyArray<GitRefRemote>;
}

export interface GitExecutable {
    readonly path: string;
    readonly version: string;
}
