import type { GitFileChange } from '../types';

const UNCOMMITTED = '*';

export function getFilePathForActions(change: GitFileChange): string {
    return change.type === 'D' ? change.oldFilePath : change.newFilePath;
}

export function canViewFileDiff(change: GitFileChange): boolean {
    const filePath = change.type === 'D' ? change.oldFilePath : change.newFilePath;
    return filePath.length > 0;
}

export function canViewFileAtRevision(change: GitFileChange): boolean {
    return change.type !== 'D';
}

export function canOpenWorkingFile(change: GitFileChange): boolean {
    return change.type !== 'D';
}

export function buildViewDiffAction(
    repo: string,
    commitHash: string,
    hasParents: boolean,
    change: GitFileChange,
): Record<string, unknown> & { action: string } {
    if (commitHash === UNCOMMITTED) {
        return {
            action: 'viewDiff',
            repo,
            fromHash: UNCOMMITTED,
            toHash: UNCOMMITTED,
            oldFilePath: change.oldFilePath,
            newFilePath: change.newFilePath,
            type: change.type,
        };
    }
    const parent = hasParents ? `${commitHash}^` : commitHash;
    return {
        action: 'viewDiff',
        repo,
        fromHash: parent,
        toHash: commitHash,
        oldFilePath: change.oldFilePath,
        newFilePath: change.newFilePath,
        type: change.type,
    };
}

export function buildViewFileAtRevisionAction(
    repo: string,
    commitHash: string,
    change: GitFileChange,
): Record<string, unknown> & { action: string } {
    return {
        action: 'viewFileAtRevision',
        repo,
        hash: commitHash,
        filePath: getFilePathForActions(change),
    };
}

export function buildOpenFileAction(
    repo: string,
    change: GitFileChange,
): Record<string, unknown> & { action: string } {
    return {
        action: 'openFile',
        repo,
        filePath: getFilePathForActions(change),
    };
}
