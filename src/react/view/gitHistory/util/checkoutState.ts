import type { GitCommit } from '../types';
import type { GitActionRequest } from './gitActionPromptFlow';

const CHECKOUT_ACTIONS = new Set(['checkoutBranch', 'checkoutCommit', 'createBranch']);

export function isCheckoutStateAction(action: GitActionRequest): boolean {
    if (!CHECKOUT_ACTIONS.has(action.action)) {
        return false;
    }
    if (action.action === 'createBranch') {
        return action.checkout === true;
    }
    return true;
}

function abbrevHash(hash: string): string {
    return hash === '*' ? '*' : hash.substring(0, 7);
}

function findCommitHashForBranch(commits: ReadonlyArray<GitCommit>, branch: string): string | null {
    for (const commit of commits) {
        if (commit.heads.includes(branch)) {
            return commit.hash;
        }
    }
    return null;
}

function moveBranchFirst(branches: ReadonlyArray<string>, branch: string): string[] {
    if (!branches.includes(branch)) {
        return [branch, ...branches];
    }
    return [branch, ...branches.filter((name) => name !== branch)];
}

function withBranchOnCommit(
    commits: ReadonlyArray<GitCommit>,
    branch: string,
    hash: string,
): GitCommit[] | null {
    let changed = false;
    const next = commits.map((commit) => {
        if (commit.hash !== hash || commit.heads.includes(branch)) {
            return commit;
        }
        changed = true;
        return { ...commit, heads: [...commit.heads, branch] };
    });
    return changed ? next : null;
}

export interface CheckoutStateUpdate {
    branchHead: string | null;
    commitHead: string | null;
    branches?: string[];
    commits?: GitCommit[];
}

export function buildCheckoutStateUpdate(
    action: GitActionRequest,
    commits: ReadonlyArray<GitCommit>,
    branches: ReadonlyArray<string>,
): CheckoutStateUpdate | null {
    if (!isCheckoutStateAction(action)) {
        return null;
    }

    if (action.action === 'checkoutCommit') {
        const hash = action.hash as string;
        return {
            branchHead: `(HEAD detached at ${abbrevHash(hash)})`,
            commitHead: hash,
        };
    }

    if (action.action === 'checkoutBranch') {
        const branch = action.branch as string;
        const hash = (action.hash as string | undefined) ?? findCommitHashForBranch(commits, branch);
        const update: CheckoutStateUpdate = {
            branchHead: branch,
            commitHead: hash,
            branches: moveBranchFirst(branches, branch),
        };
        if (hash) {
            const nextCommits = withBranchOnCommit(commits, branch, hash);
            if (nextCommits) {
                update.commits = nextCommits;
            }
        }
        return update;
    }

    if (action.action === 'createBranch' && action.checkout) {
        const branchName = action.branchName as string;
        const hash = action.hash as string;
        const update: CheckoutStateUpdate = {
            branchHead: branchName,
            commitHead: hash,
            branches: moveBranchFirst(branches, branchName),
        };
        const nextCommits = withBranchOnCommit(commits, branchName, hash);
        if (nextCommits) {
            update.commits = nextCommits;
        }
        return update;
    }

    return null;
}
