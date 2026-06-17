import type {
    GitCommit,
    GitCommitData,
    GitCommitDetails,
    GitCommitDetailsData,
    GitCommitRecord,
    GitFileChange,
    GitFileStatus,
    GitRefData,
    GitRepoInfo,
    GitStash,
    LoadCommitsRequest,
} from '../types/git';
import { UNCOMMITTED } from '../types/git';
import type { GitExecutor } from './gitExecutor';

const GIT_LOG_SEPARATOR = '---GIT_LOG_SEPARATOR---';
const EOL_REGEX = /\r\n|\r|\n/;
const INVALID_BRANCH_REGEXP = /^\(.* .*\)$/;
const REMOTE_HEAD_BRANCH_REGEXP = /\/HEAD$/;

export class CommitService {
    private readonly gitFormatLog = `%H${GIT_LOG_SEPARATOR}%P${GIT_LOG_SEPARATOR}%aN${GIT_LOG_SEPARATOR}%aE${GIT_LOG_SEPARATOR}%at${GIT_LOG_SEPARATOR}%s`;
    private readonly gitFormatCommitDetails = [
        '%H', '%P', '%aN', '%aE', '%at', '%cN', '%cE', '%ct', '%G?', '%GS', '%GK', '%B',
    ].join(GIT_LOG_SEPARATOR);
    private readonly gitFormatStash = `%H${GIT_LOG_SEPARATOR}%gD${GIT_LOG_SEPARATOR}%P${GIT_LOG_SEPARATOR}%aN${GIT_LOG_SEPARATOR}%aE${GIT_LOG_SEPARATOR}%at${GIT_LOG_SEPARATOR}%s`;
    private readonly refCache = new Map<string, GitRefData>();
    private readonly authorsCache = new Map<string, string[]>();

    constructor(private readonly executor: GitExecutor) { }

    invalidateRepoCache(repo: string): void {
        const prefix = `${repo}\0`;
        for (const key of this.refCache.keys()) {
            if (key.startsWith(prefix)) {
                this.refCache.delete(key);
            }
        }
        this.authorsCache.delete(repo);
    }

    getAuthorsCached(repo: string): Promise<string[]> {
        const cached = this.authorsCache.get(repo);
        if (cached) {
            return Promise.resolve(cached);
        }
        return this.getAuthors(repo).then((authors) => {
            this.authorsCache.set(repo, authors);
            return authors;
        });
    }

    getRepoInfo(
        repo: string,
        showRemoteBranches: boolean,
        showStashes: boolean,
        hideRemotes: ReadonlyArray<string> = []
    ): Promise<GitRepoInfo> {
        return Promise.all([
            this.getBranches(repo, showRemoteBranches, hideRemotes),
            this.getRemotes(repo),
            showStashes ? this.getStashes(repo) : Promise.resolve([] as GitStash[]),
        ]).then(([branchData, remotes, stashes]) => ({
            branches: branchData.branches,
            head: branchData.head,
            remotes,
            stashes,
            authors: [],
            hasRemoteUrl: false,
            remoteWebUrls: [],
            error: null,
        })).catch((errorMessage: string) => ({
            branches: [],
            head: null,
            remotes: [],
            stashes: [],
            authors: [],
            hasRemoteUrl: false,
            remoteWebUrls: [],
            error: errorMessage,
        }));
    }

    getCommits(request: LoadCommitsRequest): Promise<GitCommitData> {
        const {
            repo, branches, maxCommits, showTags, showRemoteBranches,
            includeCommitsMentionedByReflogs, onlyFollowFirstParent, commitOrdering,
            remotes, hideRemotes, stashes, author, searchValue, relPath,
        } = request;

        return Promise.all([
            this.getLog(
                repo, branches, maxCommits + 1, showTags, showRemoteBranches,
                includeCommitsMentionedByReflogs, onlyFollowFirstParent, commitOrdering,
                remotes, hideRemotes, stashes, author, searchValue, relPath
            ),
            this.getRefsCached(repo, showRemoteBranches, hideRemotes).catch(
                (errorMessage: string) => errorMessage
            ),
        ]).then(async ([commits, refData]) => {
            let moreCommitsAvailable = commits.length === maxCommits + 1;
            if (moreCommitsAvailable) commits = commits.slice(0, maxCommits);

            if (typeof refData === 'string') {
                if (commits.length > 0) throw refData;
                refData = { head: null, heads: [], tags: [], remotes: [] };
            }

            if (refData.head !== null) {
                for (let i = 0; i < commits.length; i++) {
                    if (refData.head === commits[i].hash) {
                        const numUncommitted = await this.getUncommittedChanges(repo);
                        if (numUncommitted > 0) {
                            commits.unshift({
                                hash: UNCOMMITTED,
                                parents: [refData.head],
                                author: '*',
                                email: '',
                                date: Math.round(Date.now() / 1000),
                                message: `Uncommitted Changes (${numUncommitted})`,
                            });
                        }
                        break;
                    }
                }
            }

            const commitNodes: GitCommit[] = [];
            const commitLookup: Record<string, number> = {};

            for (let i = 0; i < commits.length; i++) {
                commitLookup[commits[i].hash] = i;
                commitNodes.push({
                    ...commits[i],
                    heads: [],
                    tags: [],
                    remotes: [],
                    stash: null,
                });
            }

            const toAdd: { index: number; data: GitStash }[] = [];
            for (let i = 0; i < stashes.length; i++) {
                if (typeof commitLookup[stashes[i].hash] === 'number') {
                    commitNodes[commitLookup[stashes[i].hash]].stash = {
                        selector: stashes[i].selector,
                        baseHash: stashes[i].baseHash,
                        untrackedFilesHash: stashes[i].untrackedFilesHash,
                    };
                } else if (typeof commitLookup[stashes[i].baseHash] === 'number') {
                    toAdd.push({ index: commitLookup[stashes[i].baseHash], data: stashes[i] });
                }
            }
            toAdd.sort((a, b) => a.index !== b.index ? a.index - b.index : b.data.date - a.data.date);
            for (let i = toAdd.length - 1; i >= 0; i--) {
                const stash = toAdd[i].data;
                commitNodes.splice(toAdd[i].index, 0, {
                    hash: stash.hash,
                    parents: [stash.baseHash],
                    author: stash.author,
                    email: stash.email,
                    date: stash.date,
                    message: stash.message,
                    heads: [], tags: [], remotes: [],
                    stash: {
                        selector: stash.selector,
                        baseHash: stash.baseHash,
                        untrackedFilesHash: stash.untrackedFilesHash,
                    },
                });
            }
            for (let i = 0; i < commitNodes.length; i++) {
                commitLookup[commitNodes[i].hash] = i;
            }

            for (let i = 0; i < refData.heads.length; i++) {
                const idx = commitLookup[refData.heads[i].hash];
                if (typeof idx === 'number') {
                    (commitNodes[idx] as { heads: string[] }).heads.push(refData.heads[i].name);
                }
            }

            if (showTags) {
                for (let i = 0; i < refData.tags.length; i++) {
                    const idx = commitLookup[refData.tags[i].hash];
                    if (typeof idx === 'number') {
                        (commitNodes[idx] as { tags: GitCommit['tags'] }).tags.push({
                            name: refData.tags[i].name,
                            annotated: refData.tags[i].annotated,
                        });
                    }
                }
            }

            for (let i = 0; i < refData.remotes.length; i++) {
                const idx = commitLookup[refData.remotes[i].hash];
                if (typeof idx === 'number') {
                    const name = refData.remotes[i].name;
                    const remote = remotes.find((r) => name.startsWith(r + '/')) ?? null;
                    (commitNodes[idx] as { remotes: GitCommit['remotes'] }).remotes.push({
                        name,
                        remote,
                    });
                }
            }

            return {
                commits: commitNodes,
                head: refData.head,
                tags: [...new Set(refData.tags.map((t) => t.name))],
                moreCommitsAvailable,
                error: null,
            };
        }).catch((errorMessage: string) => ({
            commits: [],
            head: null,
            tags: [],
            moreCommitsAvailable: false,
            error: errorMessage,
        }));
    }

    getCommitDetails(repo: string, commitHash: string, hasParents: boolean): Promise<GitCommitDetailsData> {
        if (commitHash === UNCOMMITTED) {
            return Promise.resolve({ commitDetails: null, error: 'No details for uncommitted changes' });
        }
        const fromCommit = commitHash + (hasParents ? '^' : '');
        return Promise.all([
            this.getCommitDetailsBase(repo, commitHash),
            this.getDiffNameStatus(repo, fromCommit, commitHash),
            this.getDiffNumStat(repo, fromCommit, commitHash),
        ]).then(([details, nameStatus, numStat]) => {
            details.fileChanges = generateFileChanges(nameStatus, numStat);
            return { commitDetails: details, error: null };
        }).catch((errorMessage: string) => ({
            commitDetails: null,
            error: errorMessage,
        }));
    }

    private getLog(
        repo: string,
        branches: ReadonlyArray<string> | null,
        num: number,
        includeTags: boolean,
        includeRemotes: boolean,
        includeReflogs: boolean,
        onlyFollowFirstParent: boolean,
        order: LoadCommitsRequest['commitOrdering'],
        remotes: ReadonlyArray<string>,
        hideRemotes: ReadonlyArray<string>,
        stashes: ReadonlyArray<GitStash>,
        author?: string,
        searchValue?: string,
        relPath?: string
    ): Promise<GitCommitRecord[]> {
        const args = [
            '-c', 'log.showSignature=false', 'log',
            '--max-count=' + num,
            '--format=' + this.gitFormatLog,
            '--' + order + '-order',
        ];
        if (onlyFollowFirstParent) args.push('--first-parent');
        if (author) args.push('--author=' + author);
        if (searchValue) args.push('--grep=' + searchValue);

        if (branches !== null) {
            for (const branch of branches) args.push(branch);
        } else {
            args.push('--branches');
            if (includeTags) args.push('--tags');
            if (includeReflogs) args.push('--reflog');
            if (includeRemotes) {
                if (hideRemotes.length === 0) {
                    args.push('--remotes');
                } else {
                    for (const remote of remotes) {
                        if (!hideRemotes.includes(remote)) {
                            args.push('--glob=refs/remotes/' + remote);
                        }
                    }
                }
            }
            const stashBaseHashes = [...new Set(stashes.map((s) => s.baseHash))];
            for (const hash of stashBaseHashes) args.push(hash);
            args.push('HEAD');
        }
        args.push('--');
        if (relPath) {
            args.push('--follow', relPath);
        }

        return this.executor.spawn(args, repo, (stdout) => {
            const lines = stdout.split(EOL_REGEX);
            const commits: GitCommitRecord[] = [];
            for (let i = 0; i < lines.length - 1; i++) {
                const line = lines[i].split(GIT_LOG_SEPARATOR);
                if (line.length !== 6) break;
                commits.push({
                    hash: line[0],
                    parents: line[1] !== '' ? line[1].split(' ') : [],
                    author: line[2],
                    email: line[3],
                    date: parseInt(line[4]),
                    message: line[5],
                });
            }
            return commits;
        });
    }

    private refCacheKey(
        repo: string,
        showRemoteBranches: boolean,
        hideRemotes: ReadonlyArray<string>
    ): string {
        return `${repo}\0${showRemoteBranches}\0${hideRemotes.join('\0')}`;
    }

    private getRefsCached(
        repo: string,
        showRemoteBranches: boolean,
        hideRemotes: ReadonlyArray<string>
    ): Promise<GitRefData> {
        const key = this.refCacheKey(repo, showRemoteBranches, hideRemotes);
        const cached = this.refCache.get(key);
        if (cached) {
            return Promise.resolve(cached);
        }
        return this.getRefs(repo, showRemoteBranches, hideRemotes).then((data) => {
            this.refCache.set(key, data);
            return data;
        });
    }

    private getRefs(
        repo: string,
        showRemoteBranches: boolean,
        hideRemotes: ReadonlyArray<string>
    ): Promise<GitRefData> {
        const args = ['show-ref'];
        if (!showRemoteBranches) args.push('--heads', '--tags');
        args.push('-d', '--head');

        const hideRemotePatterns = hideRemotes.map((r) => 'refs/remotes/' + r + '/');

        return this.executor.spawn(args, repo, (stdout) => {
            const refData: GitRefData = { head: null, heads: [], tags: [], remotes: [] };
            const lines = stdout.split(EOL_REGEX);
            for (let i = 0; i < lines.length - 1; i++) {
                const parts = lines[i].split(' ');
                if (parts.length < 2) continue;
                const hash = parts.shift()!;
                const ref = parts.join(' ');

                if (ref.startsWith('refs/heads/')) {
                    refData.heads.push({ hash, name: ref.substring(11) });
                } else if (ref.startsWith('refs/tags/')) {
                    const annotated = ref.endsWith('^{}');
                    refData.tags.push({
                        hash,
                        name: annotated ? ref.substring(10, ref.length - 3) : ref.substring(10),
                        annotated,
                    });
                } else if (ref.startsWith('refs/remotes/')) {
                    if (!hideRemotePatterns.some((p) => ref.startsWith(p)) && !ref.endsWith('/HEAD')) {
                        refData.remotes.push({ hash, name: ref.substring(13) });
                    }
                } else if (ref === 'HEAD') {
                    refData.head = hash;
                }
            }
            return refData;
        });
    }

    private getBranches(
        repo: string,
        showRemoteBranches: boolean,
        hideRemotes: ReadonlyArray<string>
    ): Promise<{ branches: string[]; head: string | null }> {
        const args = ['branch'];
        if (showRemoteBranches) args.push('-a');
        args.push('--no-color');

        const hideRemotePatterns = hideRemotes.map((r) => 'remotes/' + r + '/');

        return this.executor.spawn(args, repo, (stdout) => {
            const branches: string[] = [];
            let head: string | null = null;
            const lines = stdout.split(EOL_REGEX);
            for (let i = 0; i < lines.length - 1; i++) {
                const name = lines[i].substring(2).split(' -> ')[0];
                if (INVALID_BRANCH_REGEXP.test(name)) continue;
                if (hideRemotePatterns.some((p) => name.startsWith(p))) continue;
                if (REMOTE_HEAD_BRANCH_REGEXP.test(name)) continue;
                if (lines[i][0] === '*') {
                    head = name;
                    branches.unshift(name);
                } else {
                    branches.push(name);
                }
            }
            return { branches, head };
        });
    }

    private getRemotes(repo: string): Promise<string[]> {
        return this.executor.spawn(['remote'], repo, (stdout) =>
            stdout.split(EOL_REGEX).filter((line) => line.length > 0)
        );
    }

    private getAuthors(repo: string): Promise<string[]> {
        return this.executor.spawn(
            ['shortlog', '-e', '-s', '-n', 'HEAD'],
            repo,
            (stdout) => {
                const seen = new Set<string>();
                const authors: string[] = [];
                const lines = stdout.split(EOL_REGEX);
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line) continue;
                    const tab = line.indexOf('\t');
                    const authorLine = tab >= 0 ? line.substring(tab + 1).trim() : line;
                    const emailStart = authorLine.indexOf('<');
                    const name = emailStart >= 0
                        ? authorLine.substring(0, emailStart).trim()
                        : authorLine;
                    if (!name || seen.has(name)) continue;
                    seen.add(name);
                    authors.push(name);
                }
                authors.sort((a, b) => a.localeCompare(b));
                return authors;
            }
        ).catch(() => []);
    }

    private getStashes(repo: string): Promise<GitStash[]> {
        return this.executor.spawn(
            ['reflog', '--format=' + this.gitFormatStash, 'refs/stash', '--'],
            repo,
            (stdout) => {
                const stashes: GitStash[] = [];
                const lines = stdout.split(EOL_REGEX);
                for (let i = 0; i < lines.length - 1; i++) {
                    const line = lines[i].split(GIT_LOG_SEPARATOR);
                    if (line.length < 7) continue;
                    const parents = line[2] !== '' ? line[2].split(' ') : [];
                    stashes.push({
                        hash: line[0],
                        selector: line[1],
                        baseHash: parents[0] ?? '',
                        untrackedFilesHash: parents[1] ?? null,
                        author: line[3],
                        email: line[4],
                        date: parseInt(line[5]),
                        message: line[6],
                    });
                }
                return stashes;
            }
        ).catch(() => []);
    }

    private getUncommittedChanges(repo: string): Promise<number> {
        return this.executor.spawn(
            ['status', '--untracked-files=all', '--porcelain'],
            repo,
            (stdout) => stdout.split(EOL_REGEX).filter((l) => l.length > 0).length
        ).catch(() => 0);
    }

    private getCommitDetailsBase(repo: string, commitHash: string): Promise<GitCommitDetails> {
        return this.executor.spawn(
            ['-c', 'log.showSignature=false', 'show', '--quiet', commitHash, '--format=' + this.gitFormatCommitDetails],
            repo,
            (stdout) => {
                const info = stdout.split(GIT_LOG_SEPARATOR);
                return {
                    hash: info[0],
                    parents: info[1] !== '' ? info[1].split(' ') : [],
                    author: info[2],
                    authorEmail: info[3],
                    authorDate: parseInt(info[4]),
                    committer: info[5],
                    committerEmail: info[6],
                    committerDate: parseInt(info[7]),
                    body: info.slice(11).join(GIT_LOG_SEPARATOR).trim(),
                    fileChanges: [],
                };
            }
        );
    }

    private getDiffNameStatus(repo: string, from: string, to: string) {
        return this.executor.spawn(
            ['diff', '--name-status', from, to],
            repo,
            (stdout) => {
                const records: { oldFilePath: string; newFilePath: string; type: GitFileStatus }[] = [];
                const lines = stdout.split(EOL_REGEX);
                for (let i = 0; i < lines.length - 1; i++) {
                    const parts = lines[i].split('\t');
                    if (parts.length < 2) continue;
                    const type = parts[0][0] as GitFileStatus;
                    if (type === 'R') {
                        records.push({ oldFilePath: parts[1], newFilePath: parts[2], type });
                    } else {
                        records.push({ oldFilePath: parts[1], newFilePath: parts[1], type });
                    }
                }
                return records;
            }
        ).catch(() => []);
    }

    private getDiffNumStat(repo: string, from: string, to: string) {
        return this.executor.spawn(
            ['diff', '--numstat', from, to],
            repo,
            (stdout) => {
                const records: { filePath: string; additions: number | null; deletions: number | null }[] = [];
                const lines = stdout.split(EOL_REGEX);
                for (let i = 0; i < lines.length - 1; i++) {
                    const parts = lines[i].split('\t');
                    if (parts.length < 3) continue;
                    records.push({
                        filePath: parts[2],
                        additions: parts[0] === '-' ? null : parseInt(parts[0]),
                        deletions: parts[1] === '-' ? null : parseInt(parts[1]),
                    });
                }
                return records;
            }
        ).catch(() => []);
    }
}

interface NameStatusRecord {
    oldFilePath: string;
    newFilePath: string;
    type: GitFileStatus;
}

interface NumStatRecord {
    filePath: string;
    additions: number | null;
    deletions: number | null;
}

function generateFileChanges(
    nameStatus: NameStatusRecord[],
    numStat: NumStatRecord[]
): GitFileChange[] {
    const fileChanges: GitFileChange[] = [];
    const fileLookup: Record<string, number> = {};

    for (const record of nameStatus) {
        fileLookup[record.newFilePath] = fileChanges.length;
        fileChanges.push({
            oldFilePath: record.oldFilePath,
            newFilePath: record.newFilePath,
            type: record.type,
            additions: null,
            deletions: null,
        });
    }

    for (const stat of numStat) {
        const idx = fileLookup[stat.filePath];
        if (typeof idx === 'number') {
            fileChanges[idx] = {
                ...fileChanges[idx],
                additions: stat.additions,
                deletions: stat.deletions,
            };
        }
    }

    return fileChanges;
}
