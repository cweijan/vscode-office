export function findConfiguredRemote(
    refRemoteName: string,
    remotes: ReadonlyArray<string>,
): string | null {
    for (const remote of remotes) {
        if (remote === refRemoteName || remote.toLowerCase() === refRemoteName.toLowerCase()) {
            return remote;
        }
    }
    return null;
}

/** e.g. "origin/main" + configured ["ORIGIN"] -> "ORIGIN/main" */
export function normalizeRemoteRefBranchName(
    refBranchName: string,
    remotes: ReadonlyArray<string>,
): string {
    const slashIdx = refBranchName.indexOf('/');
    if (slashIdx < 0) {
        return refBranchName;
    }
    const refRemote = refBranchName.substring(0, slashIdx);
    const branchPart = refBranchName.substring(slashIdx + 1);
    const remote = findConfiguredRemote(refRemote, remotes);
    return remote ? `${remote}/${branchPart}` : refBranchName;
}

/** e.g. "remotes/origin/main" -> "remotes/ORIGIN/main" */
export function normalizeGitBranchListName(
    name: string,
    remotes: ReadonlyArray<string>,
): string {
    const prefix = 'remotes/';
    if (!name.startsWith(prefix)) {
        return name;
    }
    return prefix + normalizeRemoteRefBranchName(name.substring(prefix.length), remotes);
}

export function remoteBranchListPrefix(remote: string): string {
    return `remotes/${remote}/`;
}

export function matchesRemoteBranchListPrefix(
    name: string,
    remote: string,
): boolean {
    return name.toLowerCase().startsWith(remoteBranchListPrefix(remote).toLowerCase());
}

export function matchesRemoteRefPrefix(
    ref: string,
    remote: string,
): boolean {
    return ref.toLowerCase().startsWith(`refs/remotes/${remote}/`.toLowerCase());
}
