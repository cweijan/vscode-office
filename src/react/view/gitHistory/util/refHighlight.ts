const DETACHED_HEAD_REGEX = /^\(HEAD detached (?:at|from) (.+)\)$/;

export function isDetachedHead(branchHead: string | null): boolean {
    return branchHead !== null && branchHead.startsWith('(HEAD detached');
}

export function isActiveBranchRef(branchName: string, branchHead: string | null): boolean {
    return branchHead !== null && !isDetachedHead(branchHead) && branchName === branchHead;
}

export function isActiveTagRef(
    tagName: string,
    branchHead: string | null,
    commitHash: string,
    commitHead: string | null,
): boolean {
    if (branchHead === null || commitHead === null || commitHash !== commitHead) {
        return false;
    }
    if (branchHead === tagName) {
        return true;
    }
    const detached = branchHead.match(DETACHED_HEAD_REGEX);
    return detached !== null && detached[1] === tagName;
}

export function getCheckedOutBranchLabel(branchHead: string | null): string | null {
    if (branchHead === null || isDetachedHead(branchHead)) {
        return null;
    }
    return branchHead;
}
