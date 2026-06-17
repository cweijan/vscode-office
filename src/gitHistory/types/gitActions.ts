import type { GitFileStatus } from './git';
import type { GitResetMode } from '../service/gitRepoCommands';

export type GitActionPayload =
    | { action: 'copyToClipboard'; text: string }
    | { action: 'checkoutBranch'; repo: string; branch: string; remoteTracking?: string; hash?: string }
    | { action: 'checkoutCommit'; repo: string; hash: string }
    | { action: 'createBranch'; repo: string; hash: string; branchName: string; checkout: boolean }
    | { action: 'deleteBranch'; repo: string; branch: string; force: boolean }
    | { action: 'renameBranch'; repo: string; branch: string; newName: string }
    | { action: 'deleteRemoteBranch'; repo: string; branch: string; remote: string }
    | { action: 'pullBranch'; repo: string; branch: string; remote: string; noFastForward?: boolean; squash?: boolean }
    | { action: 'pushBranch'; repo: string; branch: string; remote: string }
    | { action: 'merge'; repo: string; ref: string; mergeOn?: 'commit' | 'branch' | 'remote'; createNewCommit?: boolean; squash?: boolean; noCommit?: boolean }
    | { action: 'cherryPick'; repo: string; hash: string; parents?: string[]; parentIndex?: number; recordOrigin?: boolean; noCommit?: boolean }
    | { action: 'revertCommit'; repo: string; hash: string; parentIndex?: number }
    | { action: 'resetToCommit'; repo: string; hash: string; mode: GitResetMode }
    | { action: 'addTag'; repo: string; hash: string; remotes?: string[]; tagName: string; annotated: boolean; message?: string; pushToRemote?: string | null }
    | { action: 'deleteTag'; repo: string; tag: string }
    | { action: 'pushTag'; repo: string; tag: string; remote: string }
    | { action: 'applyStash'; repo: string; selector: string }
    | { action: 'popStash'; repo: string; selector: string }
    | { action: 'dropStash'; repo: string; selector: string }
    | { action: 'branchFromStash'; repo: string; selector: string; branchName: string }
    | { action: 'pushStash'; repo: string; message: string }
    | { action: 'resetUncommitted'; repo: string; mode: GitResetMode }
    | { action: 'cleanUntracked'; repo: string; directories: boolean }
    | { action: 'viewScm' }
    | { action: 'openFile'; repo: string; filePath: string }
    | { action: 'viewFileAtRevision'; repo: string; hash: string; filePath: string }
    | { action: 'viewDiff'; repo: string; fromHash: string; toHash: string; oldFilePath: string; newFilePath: string; type: GitFileStatus }
    | { action: 'viewDiffWithWorking'; repo: string; hash: string; filePath: string }
    | { action: 'copyFilePath'; repo: string; filePath: string; absolute: boolean };

export interface GitActionResult {
    error: string | null;
    refresh: boolean;
}
