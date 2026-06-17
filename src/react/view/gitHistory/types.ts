export interface GitCommitTag {
    name: string;
    annotated: boolean;
}

export interface GitCommitRemote {
    name: string;
    remote: string | null;
}

export interface GitCommitStash {
    selector: string;
    baseHash: string;
    untrackedFilesHash: string | null;
}

export interface GitCommit {
    hash: string;
    parents: string[];
    author: string;
    email: string;
    date: number;
    message: string;
    heads: string[];
    tags: GitCommitTag[];
    remotes: GitCommitRemote[];
    stash: GitCommitStash | null;
}

export interface GitStash {
    hash: string;
    baseHash: string;
    untrackedFilesHash: string | null;
    selector: string;
    author: string;
    email: string;
    date: number;
    message: string;
}

export interface GitRepoExtras {
    authors: string[];
    hasRemoteUrl: boolean;
    remoteWebUrls: { name: string; url: string }[];
}

export interface GitRepoInfo {
    branches: string[];
    head: string | null;
    remotes: string[];
    stashes: GitStash[];
    authors: string[];
    hasRemoteUrl: boolean;
    remoteWebUrls: { name: string; url: string }[];
    error: string | null;
}

export interface GitCommitData {
    commits: GitCommit[];
    head: string | null;
    tags: string[];
    moreCommitsAvailable: boolean;
    relPath?: string | null;
    error: string | null;
}

export interface GitFileChange {
    oldFilePath: string;
    newFilePath: string;
    type: string;
    additions: number | null;
    deletions: number | null;
}

export interface GitCommitDetails {
    hash: string;
    parents: string[];
    author: string;
    authorEmail: string;
    authorDate: number;
    committer: string;
    committerEmail: string;
    committerDate: number;
    body: string;
    fileChanges: GitFileChange[];
}

export interface GitCommitDetailsData {
    commitDetails: GitCommitDetails | null;
    error: string | null;
}

export interface GitHistoryInitPayload {
    repos: string[];
    initialRepo: string | null;
    preferredRepo?: string | null;
    filePath?: string | null;
    fileName?: string | null;
    relPath?: string | null;
    fileHistorySplitLayout?: 'vertical' | 'horizontal';
    viewColumn?: number;
}

export interface GitRemoteDetail {
    name: string;
    url: string | null;
    pushUrl: string | null;
}
