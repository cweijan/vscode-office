import type { GitCommit } from '../types';
import { UNCOMMITTED } from '../graph/layoutEngine';

export function isSelectableCommit(commit: GitCommit | undefined): boolean {
    if (!commit) {
        return false;
    }
    return commit.hash !== UNCOMMITTED && !commit.stash;
}

export function abbrevCommitHash(hash: string): string {
    return hash === UNCOMMITTED ? '*' : hash.substring(0, 7);
}

export function computeRangeSelection(
    fromIndex: number,
    toIndex: number,
    commits: ReadonlyArray<GitCommit>,
): Set<number> {
    const start = Math.min(fromIndex, toIndex);
    const end = Math.max(fromIndex, toIndex);
    const result = new Set<number>();
    for (let index = start; index <= end; index++) {
        if (isSelectableCommit(commits[index])) {
            result.add(index);
        }
    }
    return result;
}

export function getSelectedCommits(
    commits: ReadonlyArray<GitCommit>,
    selectedIndices: ReadonlySet<number>,
): GitCommit[] {
    const selected: GitCommit[] = [];
    for (const index of selectedIndices) {
        const commit = commits[index];
        if (isSelectableCommit(commit)) {
            selected.push(commit);
        }
    }
    return selected;
}

export function sortCommitsByListOrder(
    commits: ReadonlyArray<GitCommit>,
    selectedIndices: ReadonlySet<number>,
): GitCommit[] {
    const indices: number[] = [];
    for (const index of selectedIndices) {
        indices.push(index);
    }
    indices.sort((a, b) => a - b);
    const result: GitCommit[] = [];
    for (const index of indices) {
        const commit = commits[index];
        if (isSelectableCommit(commit)) {
            result.push(commit);
        }
    }
    return result;
}

export function sortCommitsForCherryPick(
    commits: ReadonlyArray<GitCommit>,
    selectedIndices: ReadonlySet<number>,
): GitCommit[] {
    const indices: number[] = [];
    for (const index of selectedIndices) {
        indices.push(index);
    }
    indices.sort((a, b) => b - a);
    const result: GitCommit[] = [];
    for (const index of indices) {
        const commit = commits[index];
        if (isSelectableCommit(commit)) {
            result.push(commit);
        }
    }
    return result;
}

export function sortCommitsForRevert(
    commits: ReadonlyArray<GitCommit>,
    selectedIndices: ReadonlySet<number>,
): GitCommit[] {
    const indices: number[] = [];
    for (const index of selectedIndices) {
        indices.push(index);
    }
    indices.sort((a, b) => a - b);
    const result: GitCommit[] = [];
    for (const index of indices) {
        const commit = commits[index];
        if (isSelectableCommit(commit)) {
            result.push(commit);
        }
    }
    return result;
}

export function formatCommitMessages(commits: ReadonlyArray<GitCommit>): string {
    const lines: string[] = [];
    for (const commit of commits) {
        lines.push(commit.message);
    }
    return lines.join('\n');
}

export function formatCommitHashes(commits: ReadonlyArray<GitCommit>): string {
    const lines: string[] = [];
    for (const commit of commits) {
        lines.push(commit.hash.substring(0, 8));
    }
    return lines.join('\n');
}

export function buildBatchActionMessage(
    commits: ReadonlyArray<GitCommit>,
    action: 'cherryPick' | 'revert',
): string {
    const orderNote = action === 'cherryPick'
        ? 'Commits will be cherry-picked from oldest to newest.'
        : 'Commits will be reverted from newest to oldest.';
    const lines: string[] = [orderNote, ''];
    for (const commit of commits) {
        const subject = commit.message.split('\n')[0] ?? commit.message;
        lines.push(`${abbrevCommitHash(commit.hash)} ${subject}`);
    }
    const mergeCount = commits.filter((commit) => commit.parents.length > 1).length;
    if (mergeCount > 0) {
        lines.push('', `${mergeCount} merge commit(s) will use the mainline parent (parent 1).`);
    }
    return lines.join('\n');
}

export function buildCherryPickAction(commit: GitCommit, repo: string): Record<string, unknown> & { action: string } {
    return {
        action: 'cherryPick',
        repo,
        hash: commit.hash,
        parents: commit.parents,
        parentIndex: commit.parents.length > 1 ? 1 : 0,
        recordOrigin: false,
        noCommit: false,
    };
}

export function buildRevertAction(commit: GitCommit, repo: string): Record<string, unknown> & { action: string } {
    return {
        action: 'revertCommit',
        repo,
        hash: commit.hash,
        parentIndex: commit.parents.length > 1 ? 1 : 0,
    };
}
