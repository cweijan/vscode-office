import type { GitCommitRemote } from '../types';

export interface BranchHeadLabel {
    name: string;
    remotes: string[];
}

export interface BranchLabels {
    heads: BranchHeadLabel[];
    remotes: GitCommitRemote[];
}

export function getBranchLabels(
    heads: ReadonlyArray<string>,
    remotes: ReadonlyArray<GitCommitRemote>,
    combineLocalAndRemote = true,
): BranchLabels {
    const headLabels: BranchHeadLabel[] = [];
    const headLookup: Record<string, number> = {};

    for (const name of heads) {
        headLookup[name] = headLabels.length;
        headLabels.push({ name, remotes: [] });
    }

    if (!combineLocalAndRemote) {
        return { heads: headLabels, remotes: [...remotes] };
    }

    const remainingRemotes: GitCommitRemote[] = [];
    for (const remote of remotes) {
        if (remote.remote !== null) {
            const branchName = remote.name.substring(remote.remote.length + 1);
            const headIndex = headLookup[branchName];
            if (typeof headIndex === 'number') {
                if (!headLabels[headIndex].remotes.includes(remote.remote)) {
                    headLabels[headIndex].remotes.push(remote.remote);
                }
                continue;
            }
        }
        remainingRemotes.push(remote);
    }

    return { heads: headLabels, remotes: remainingRemotes };
}
