import type { ContextMenuItem } from '../components/ContextMenu';
import type { GitCommit, GitCommitRemote, GitFileChange } from '../types';

const UNCOMMITTED = '*';

export interface GitActionEmitter {
    (action: Record<string, unknown> & { action: string }): void;
}

import type { GitPullDefaults } from '../util/gitHistoryState';

export interface MenuContext {
    repo: string;
    head: string | null;
    remotes: string[];
    branches: string[];
    relPath?: string | null;
    pullDefaults: GitPullDefaults;
    emit: GitActionEmitter;
}

function sep(items: ContextMenuItem[]): ContextMenuItem[] {
    if (items.length === 0) return items;
    const next = [...items];
    next[0] = { ...next[0], separatorBefore: true };
    return next;
}

export function buildCommitContextMenu(commit: GitCommit, ctx: MenuContext): ContextMenuItem[] {
    if (commit.hash === UNCOMMITTED) {
        return buildUncommittedContextMenu(ctx);
    }
    if (commit.stash) {
        return buildStashContextMenu(commit.stash.selector, ctx);
    }

    const hash = commit.hash;
    const items: ContextMenuItem[] = [
        { id: 'copyHash', label: 'Copy Commit Hash' },
        { id: 'copyMessage', label: 'Copy Commit Message' },
        { id: 'reset', label: 'Reset Branch...' },
        { id: 'createBranch', label: 'Create Branch...' },
        { id: 'addTag', label: 'Add Tag...' },
        ...sep([
            { id: 'checkout', label: 'Checkout...' },
            { id: 'cherryPick', label: 'Cherry Pick...' },
            { id: 'revert', label: 'Revert...' },
        ]),
        ...sep([
            { id: 'merge', label: 'Merge into current branch...' },
        ]),
        ...sep([
            { id: 'copySubject', label: 'Copy Commit Subject' },
        ]),
    ];

    return items.map((item) => ({
        ...item,
        _hash: hash,
        _parents: commit.parents,
        _message: commit.message,
    })) as ContextMenuItem[];
}

export function buildBranchContextMenu(
    branchName: string,
    commitHash: string,
    ctx: MenuContext
): ContextMenuItem[] {
    const isHead = ctx.head === branchName;
    return [
        { id: 'checkoutBranch', label: 'Checkout Branch', disabled: isHead },
        { id: 'renameBranch', label: 'Rename Branch...' },
        { id: 'deleteBranch', label: 'Delete Branch...', disabled: isHead },
        ...sep([
            { id: 'mergeBranch', label: 'Merge into current branch...', disabled: isHead },
            { id: 'pushBranch', label: 'Push Branch...', disabled: ctx.remotes.length === 0 },
        ]),
        ...sep([
            { id: 'copyBranch', label: 'Copy Branch Name' },
        ]),
    ].map((item) => ({ ...item, _branch: branchName, _hash: commitHash })) as ContextMenuItem[];
}

export function buildRemoteBranchContextMenu(
    remoteName: string,
    refName: string,
    branchName: string,
    ctx: MenuContext
): ContextMenuItem[] {
    const localExists = ctx.branches.includes(branchName);
    return [
        { id: 'checkoutRemote', label: 'Checkout Branch...' },
        { id: 'deleteRemoteBranch', label: 'Delete Remote Branch...' },
        ...sep([
            { id: 'pullRemote', label: 'Pull into current branch...', disabled: !localExists },
            { id: 'mergeRemote', label: 'Merge into current branch...' },
        ]),
        ...sep([
            { id: 'copyRemote', label: 'Copy Branch Name' },
        ]),
    ].map((item) => ({
        ...item,
        _remote: remoteName,
        _ref: refName,
        _branch: branchName,
    })) as ContextMenuItem[];
}

export function buildTagContextMenu(tagName: string, ctx: MenuContext): ContextMenuItem[] {
    return [
        { id: 'deleteTag', label: 'Delete Tag...' },
        { id: 'pushTag', label: 'Push Tag...', disabled: ctx.remotes.length === 0 },
        ...sep([{ id: 'copyTag', label: 'Copy Tag Name' }]),
    ].map((item) => ({ ...item, _tag: tagName })) as ContextMenuItem[];
}

export function buildStashContextMenu(selector: string, _ctx: MenuContext): ContextMenuItem[] {
    return [
        { id: 'applyStash', label: 'Apply Stash' },
        { id: 'popStash', label: 'Pop Stash...' },
        { id: 'dropStash', label: 'Drop Stash...' },
        ...sep([{ id: 'branchFromStash', label: 'Create Branch from Stash...' }]),
    ].map((item) => ({ ...item, _selector: selector })) as ContextMenuItem[];
}

export function buildUncommittedContextMenu(_ctx: MenuContext): ContextMenuItem[] {
    return [
        { id: 'pushStash', label: 'Stash uncommitted changes...' },
        ...sep([
            { id: 'resetUncommittedMixed', label: 'Reset uncommitted changes (Mixed)...' },
            { id: 'resetUncommittedHard', label: 'Reset uncommitted changes (Hard)...' },
            { id: 'cleanUntracked', label: 'Clean untracked files...' },
        ]),
        ...sep([{ id: 'viewScm', label: 'Open Source Control View' }]),
    ];
}

export function buildFileChangeContextMenu(
    change: GitFileChange,
    commitHash: string,
    hasParents: boolean,
    _ctx: MenuContext
): ContextMenuItem[] {
    const path = change.type === 'D' ? change.oldFilePath : change.newFilePath;
    const items: ContextMenuItem[] = [
        { id: 'viewDiff', label: 'View Diff' },
        { id: 'viewFileAtRevision', label: 'View File at This Revision' },
        { id: 'openFile', label: 'Open File' },
        ...sep([
            { id: 'copyRelPath', label: 'Copy Relative File Path' },
            { id: 'copyAbsPath', label: 'Copy Absolute File Path' },
        ]),
    ];
    if (commitHash !== UNCOMMITTED && hasParents) {
        items.push({ id: 'viewDiffWorking', label: 'View Diff with Working File', separatorBefore: true });
    }
    return items.map((item) => ({
        ...item,
        _hash: commitHash,
        _change: change,
        _hasParents: hasParents,
        _path: path,
    })) as ContextMenuItem[];
}

export interface MenuPayloadMeta {
    _hash?: string;
    _parents?: string[];
    _message?: string;
    _branch?: string;
    _remote?: string;
    _ref?: string;
    _tag?: string;
    _selector?: string;
    _change?: GitFileChange;
    _hasParents?: boolean;
    _path?: string;
}

export function runContextMenuAction(
    id: string,
    meta: MenuPayloadMeta,
    ctx: MenuContext
): void {
    const { repo, emit } = ctx;
    switch (id) {
        case 'copyHash':
            emit({ action: 'copyToClipboard', text: meta._hash?.substring(0, 8) ?? '' });
            break;
        case 'copyMessage':
        case 'copySubject':
            emit({ action: 'copyToClipboard', text: meta._message ?? '' });
            break;
        case 'reset':
            emit({ action: 'resetToCommit', repo, hash: meta._hash! });
            break;
        case 'createBranch':
            emit({ action: 'createBranch', repo, hash: meta._hash! });
            break;
        case 'addTag':
            emit({ action: 'addTag', repo, hash: meta._hash! });
            break;
        case 'checkout':
            emit({ action: 'checkoutCommit', repo, hash: meta._hash! });
            break;
        case 'cherryPick':
            emit({ action: 'cherryPick', repo, hash: meta._hash!, parentIndex: meta._parents && meta._parents.length > 1 ? 1 : 0 });
            break;
        case 'revert':
            emit({ action: 'revertCommit', repo, hash: meta._hash!, parentIndex: meta._parents && meta._parents.length > 1 ? 1 : 0 });
            break;
        case 'merge':
            emit({ action: 'merge', repo, ref: meta._hash! });
            break;
        case 'checkoutBranch':
            emit({ action: 'checkoutBranch', repo, branch: meta._branch!, hash: meta._hash });
            break;
        case 'renameBranch':
            emit({ action: 'renameBranch', repo, branch: meta._branch! });
            break;
        case 'deleteBranch':
            emit({ action: 'deleteBranch', repo, branch: meta._branch! });
            break;
        case 'mergeBranch':
            emit({ action: 'merge', repo, ref: meta._branch! });
            break;
        case 'pushBranch':
            if (ctx.remotes[0]) {
                emit({ action: 'pushBranch', repo, branch: meta._branch!, remote: ctx.remotes[0] });
            }
            break;
        case 'copyBranch':
        case 'copyRemote':
            emit({ action: 'copyToClipboard', text: meta._branch ?? meta._ref ?? '' });
            break;
        case 'checkoutRemote':
            emit({
                action: 'checkoutBranch',
                repo,
                branch: meta._branch!,
                remoteTracking: meta._ref,
                hash: meta._hash,
            });
            break;
        case 'deleteRemoteBranch':
            emit({ action: 'deleteRemoteBranch', repo, branch: meta._branch!, remote: meta._remote! });
            break;
        case 'pullRemote':
            emit({
                action: 'pullBranch',
                repo,
                branch: meta._branch!,
                remote: meta._remote!,
                noFastForward: ctx.pullDefaults.noFastForward,
                squash: ctx.pullDefaults.squash,
            });
            break;
        case 'mergeRemote':
            emit({ action: 'merge', repo, ref: meta._ref! });
            break;
        case 'deleteTag':
            emit({ action: 'deleteTag', repo, tag: meta._tag! });
            break;
        case 'pushTag':
            if (ctx.remotes[0]) {
                emit({ action: 'pushTag', repo, tag: meta._tag!, remote: ctx.remotes[0] });
            }
            break;
        case 'copyTag':
            emit({ action: 'copyToClipboard', text: meta._tag ?? '' });
            break;
        case 'applyStash':
            emit({ action: 'applyStash', repo, selector: meta._selector! });
            break;
        case 'popStash':
            emit({ action: 'popStash', repo, selector: meta._selector! });
            break;
        case 'dropStash':
            emit({ action: 'dropStash', repo, selector: meta._selector! });
            break;
        case 'branchFromStash':
            emit({ action: 'branchFromStash', repo, selector: meta._selector! });
            break;
        case 'pushStash':
            emit({ action: 'pushStash', repo });
            break;
        case 'resetUncommittedMixed':
            emit({ action: 'resetUncommitted', repo, mode: 'mixed' });
            break;
        case 'resetUncommittedHard':
            emit({ action: 'resetUncommitted', repo, mode: 'hard' });
            break;
        case 'cleanUntracked':
            emit({ action: 'cleanUntracked', repo, directories: true });
            break;
        case 'viewScm':
            emit({ action: 'viewScm' });
            break;
        case 'viewDiff':
            if (meta._change && meta._hash) {
                const parent = meta._hasParents ? `${meta._hash}^` : meta._hash;
                emit({
                    action: 'viewDiff',
                    repo,
                    fromHash: parent,
                    toHash: meta._hash,
                    oldFilePath: meta._change.oldFilePath,
                    newFilePath: meta._change.newFilePath,
                    type: meta._change.type,
                });
            }
            break;
        case 'viewDiffWorking':
            if (meta._hash && meta._path) {
                emit({ action: 'viewDiffWithWorking', repo, hash: meta._hash, filePath: meta._path });
            }
            break;
        case 'viewFileAtRevision':
            if (meta._hash && meta._path) {
                emit({ action: 'viewFileAtRevision', repo, hash: meta._hash, filePath: meta._path });
            }
            break;
        case 'openFile':
            if (meta._path) {
                emit({ action: 'openFile', repo, filePath: meta._path });
            }
            break;
        case 'copyRelPath':
            if (meta._path) {
                emit({ action: 'copyFilePath', repo, filePath: meta._path, absolute: false });
            }
            break;
        case 'copyAbsPath':
            if (meta._path) {
                emit({ action: 'copyFilePath', repo, filePath: meta._path, absolute: true });
            }
            break;
        default:
            break;
    }
}

type ExtendedContextMenuItem = ContextMenuItem & MenuPayloadMeta;

export type { ExtendedContextMenuItem };

export function prepareContextMenu(items: ExtendedContextMenuItem[]): {
    items: ContextMenuItem[];
    metaById: Record<string, MenuPayloadMeta>;
} {
    const metaById: Record<string, MenuPayloadMeta> = {};
    const stripped: ContextMenuItem[] = [];
    for (const item of items) {
        const { id, label, disabled, separatorBefore, ...meta } = item;
        metaById[id] = meta;
        stripped.push({ id, label, disabled, separatorBefore });
    }
    return { items: stripped, metaById };
}

export function parseRemoteBranch(remote: GitCommitRemote): {
    remoteName: string;
    branchName: string;
} {
    const remoteName = remote.remote ?? remote.name.split('/')[0] ?? '';
    const slashIdx = remote.name.indexOf('/');
    const branchName = slashIdx >= 0 ? remote.name.substring(slashIdx + 1) : remote.name;
    return { remoteName, branchName };
}
