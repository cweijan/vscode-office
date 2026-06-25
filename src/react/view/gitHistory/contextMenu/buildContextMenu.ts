import type { ContextMenuItem } from '../components/ContextMenu';
import { $t } from '../../../i18n/i18nConfig';
import type { GitCommit, GitCommitRemote, GitFileChange } from '../types';
import type { GitPullDefaults } from '../util/gitHistoryState';

const UNCOMMITTED = '*';
const EMPTY_TREE_HASH = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';

export interface GitActionEmitter {
    (action: Record<string, unknown> & { action: string }): void;
}

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
        { id: 'copyHash', label: $t('git.copyCommitHash') },
        { id: 'copyMessage', label: $t('git.copyCommitMessage') },
        { id: 'reset', label: $t('git.resetBranch') },
        { id: 'createBranch', label: $t('git.createBranch') },
        { id: 'addTag', label: $t('git.addTag') },
        ...sep([
            { id: 'checkout', label: 'Checkout' },
            { id: 'cherryPick', label: 'Cherry Pick' },
            { id: 'revert', label: 'Revert' },
        ]),
        ...sep([
            { id: 'merge', label: $t('git.mergeIntoCurrent') },
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
        { id: 'checkoutBranch', label: $t('git.checkoutBranch'), disabled: isHead },
        { id: 'renameBranch', label: $t('git.renameBranch') },
        { id: 'deleteBranch', label: $t('git.deleteBranch'), disabled: isHead },
        ...sep([
            { id: 'mergeBranch', label: $t('git.mergeIntoCurrent'), disabled: isHead },
            { id: 'pushBranch', label: $t('git.pushBranchMenu'), disabled: ctx.remotes.length === 0 },
        ]),
        ...sep([
            { id: 'copyBranch', label: $t('git.copyBranchName') },
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
        { id: 'checkoutRemote', label: $t('git.checkoutBranch') },
        { id: 'deleteRemoteBranch', label: $t('git.deleteRemoteBranch') },
        ...sep([
            { id: 'pullRemote', label: $t('git.pullIntoCurrent'), disabled: !localExists },
            { id: 'mergeRemote', label: $t('git.mergeIntoCurrent') },
        ]),
        ...sep([
            { id: 'copyRemote', label: $t('git.copyBranchName') },
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
        { id: 'pushTag', label: $t('git.pushTag'), disabled: ctx.remotes.length === 0 },
        { id: 'deleteTag', label: $t('git.deleteTag') },
        ...sep([{ id: 'copyTag', label: $t('git.copyTagName') }]),
    ].map((item) => ({ ...item, _tag: tagName })) as ContextMenuItem[];
}

export function buildStashContextMenu(selector: string, _ctx: MenuContext): ContextMenuItem[] {
    return [
        { id: 'applyStash', label: $t('git.applyStash') },
        { id: 'popStash', label: $t('git.popStash') },
        { id: 'dropStash', label: $t('git.dropStash') },
        ...sep([{ id: 'branchFromStash', label: $t('git.createBranchFromStash') }]),
    ].map((item) => ({ ...item, _selector: selector })) as ContextMenuItem[];
}

export function buildUncommittedContextMenu(_ctx: MenuContext): ContextMenuItem[] {
    return [
        { id: 'pushStash', label: $t('git.stashUncommitted') },
        ...sep([
            { id: 'resetUncommittedMixed', label: $t('git.resetUncommittedMixed') },
            { id: 'resetUncommittedHard', label: $t('git.resetUncommittedHard') },
            { id: 'cleanUntracked', label: $t('git.cleanUntrackedFiles') },
        ]),
        ...sep([{ id: 'viewScm', label: $t('git.openScm') }]),
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
        { id: 'viewDiff', label: $t('git.viewDiff') },
        { id: 'viewFileAtRevision', label: $t('git.viewFileAtThisRevision') },
        { id: 'openFile', label: $t('git.openFile') },
        ...sep([
            { id: 'copyRelPath', label: $t('git.copyRelPath') },
            { id: 'copyAbsPath', label: $t('git.copyAbsPath') },
        ]),
    ];
    if (commitHash !== UNCOMMITTED && hasParents) {
        items.push({ id: 'viewDiffWorking', label: $t('git.viewDiffWorking'), separatorBefore: true });
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
            emit({ action: 'copyToClipboard', text: meta._message ?? '' });
            break;
        case 'reset':
            emit({ action: 'resetToCommit', repo, hash: meta._hash! });
            break;
        case 'createBranch':
            emit({ action: 'createBranch', repo, hash: meta._hash! });
            break;
        case 'addTag':
            emit({ action: 'addTag', repo, hash: meta._hash!, remotes: ctx.remotes });
            break;
        case 'checkout':
            emit({ action: 'checkoutCommit', repo, hash: meta._hash! });
            break;
        case 'cherryPick':
            emit({ action: 'cherryPick', repo, hash: meta._hash!, parents: meta._parents ?? [] });
            break;
        case 'revert':
            emit({ action: 'revertCommit', repo, hash: meta._hash!, parentIndex: meta._parents && meta._parents.length > 1 ? 1 : 0 });
            break;
        case 'merge':
            emit({ action: 'merge', repo, ref: meta._hash!, mergeOn: 'commit' });
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
            emit({ action: 'merge', repo, ref: meta._branch!, mergeOn: 'branch' });
            break;
        case 'pushBranch':
            if (ctx.remotes[0]) {
                emit({ action: 'pushBranch', repo, branch: meta._branch!, remote: ctx.remotes[0], remotes: ctx.remotes });
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
            emit({ action: 'merge', repo, ref: meta._ref!, mergeOn: 'branch' });
            break;
        case 'deleteTag':
            emit({ action: 'deleteTag', repo, tag: meta._tag!, remotes: ctx.remotes });
            break;
        case 'pushTag':
            emit({ action: 'pushTag', repo, tag: meta._tag!, remote: ctx.remotes[0] ?? '', remotes: ctx.remotes });
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
                const parent = meta._hasParents ? `${meta._hash}^` : EMPTY_TREE_HASH;
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
