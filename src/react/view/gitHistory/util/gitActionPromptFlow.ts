import { $t } from '../../../i18n/i18nConfig';

export type FormField =
    | { type: 'text'; id: string; label: string; placeholder?: string; defaultValue?: string; info?: string }
    | { type: 'checkbox'; id: string; label: string; defaultValue?: boolean; info?: string }
    | { type: 'select'; id: string; label: string; options: { value: string; label: string }[]; defaultValue?: string; info?: string };

export type PromptStep =
    | {
        kind: 'confirm';
        id: string;
        title: string;
        message: string;
        confirmLabel: string;
        danger?: boolean;
        variant?: 'revertCommit';
        commitHash?: string;
        fields?: FormField[];
    }
    | {
        kind: 'input';
        id: string;
        title: string;
        label: string;
        placeholder?: string;
        defaultValue?: string;
        optional?: boolean;
    }
    | {
        kind: 'pick';
        id: string;
        title: string;
        message?: string;
        options: { value: string; label: string; description?: string }[];
        variant?: 'resetMode' | 'pushRemote' | 'openRemote';
        branchName?: string | null;
        commitHash?: string;
        submitLabel?: string;
        fields?: FormField[];
    }
    | {
        kind: 'form';
        id: string;
        title: string;
        message?: string;
        submitLabel: string;
        fields: FormField[];
        variant?: 'createBranch' | 'cherryPick' | 'merge' | 'addTag' | 'deleteBranch';
        commitHash?: string;
        mergeOn?: 'commit' | 'branch';
        mergeTarget?: string;
        branchName?: string | null;
    };

export type GitActionRequest = Record<string, unknown> & { action: string };

export type PromptSubmitValue = string | Record<string, string>;

function abbrevHash(hash: string): string {
    return hash === '*' ? '*' : hash.substring(0, 8);
}

export function getPromptSteps(
    payload: GitActionRequest,
    ctx: { remotes: string[]; branchHead: string | null },
): PromptStep[] | null {
    switch (payload.action) {
        case 'createBranch':
            return [{
                kind: 'form',
                id: 'createBranch',
                title: $t('git.createBranch'),
                variant: 'createBranch',
                commitHash: payload.hash as string,
                submitLabel: $t('git.createBranch'),
                fields: [
                    { type: 'text', id: 'branchName', label: $t('git.branchName'), placeholder: 'branch-name' },
                    { type: 'checkbox', id: 'checkout', label: $t('git.checkOut'), defaultValue: false },
                ],
            }];
        case 'deleteBranch':
            return [{
                kind: 'form',
                id: 'deleteBranch',
                title: $t('git.deleteBranch'),
                variant: 'deleteBranch',
                branchName: payload.branch as string,
                submitLabel: $t('common.delete'),
                fields: [
                    { type: 'checkbox', id: 'forceDelete', label: $t('git.forceDelete'), defaultValue: false },
                ],
            }];
        case 'renameBranch':
            return [{
                kind: 'input',
                id: 'newName',
                title: $t('git.renameBranch'),
                label: $t('git.newBranchName'),
                defaultValue: payload.branch as string,
            }];
        case 'deleteRemoteBranch':
            return [{
                kind: 'confirm',
                id: 'confirm',
                title: $t('git.deleteRemoteBranchTitle'),
                message: $t('git.deleteRemoteBranchMsg', {
                    remote: String(payload.remote),
                    branch: String(payload.branch),
                }),
                confirmLabel: $t('common.delete'),
                danger: true,
            }];
        case 'pushBranch': {
            const remoteFields: FormField[] = ctx.remotes.map((remote, index) => ({
                type: 'checkbox' as const,
                id: `remote_${remote}`,
                label: remote,
                defaultValue: index === 0,
            }));
            const fields: FormField[] = [
                ...remoteFields,
                { type: 'checkbox', id: 'force', label: $t('git.forcePush'), defaultValue: false },
            ];
            return [{
                kind: 'form',
                id: 'pushBranch',
                title: $t('git.pushBranch'),
                variant: 'pushBranch' as any,
                message: ctx.remotes.length > 1
                    ? $t('git.pushBranchToRemote', { branch: payload.branch as string })
                    : $t('git.pushBranchTo', { branch: payload.branch as string, remote: ctx.remotes[0] ?? '' }),
                submitLabel: $t('git.push'),
                fields,
            }];
        }
        case 'merge': {
            const mergeOn = payload.mergeOn === 'commit' ? 'commit' : 'branch';
            const ref = payload.ref as string;
            const mergeTarget = mergeOn === 'commit' ? abbrevHash(ref) : ref;
            const branchName = ctx.branchHead && !ctx.branchHead.startsWith('(HEAD detached')
                ? ctx.branchHead
                : null;
            const mergeKind = mergeOn === 'commit' ? 'commit' : 'branch';
            return [{
                kind: 'form',
                id: 'merge',
                title: $t('git.merge'),
                variant: 'merge',
                mergeOn,
                mergeTarget,
                branchName,
                submitLabel: $t('git.merge'),
                fields: [
                    {
                        type: 'checkbox',
                        id: 'createNewCommit',
                        label: $t('git.createNewCommit'),
                        defaultValue: true,
                    },
                    {
                        type: 'checkbox',
                        id: 'squash',
                        label: $t('git.squashCommits'),
                        defaultValue: false,
                        info: $t('git.squashInfo', { kind: $t(mergeKind === 'commit' ? 'git.commit' : 'git.branch') }),
                    },
                    {
                        type: 'checkbox',
                        id: 'noCommit',
                        label: $t('git.noCommit'),
                        defaultValue: false,
                        info: $t('git.noCommitMergeInfo'),
                    },
                ],
            }];
        }
        case 'cherryPick': {
            const parents = Array.isArray(payload.parents) ? payload.parents as string[] : [];
            const fields: FormField[] = [];
            if (parents.length > 1) {
                fields.push({
                    type: 'select',
                    id: 'parentIndex',
                    label: $t('git.parentHash'),
                    defaultValue: '1',
                    info: $t('git.parentHashInfo'),
                    options: parents.map((hash, index) => ({
                        value: String(index + 1),
                        label: abbrevHash(hash),
                    })),
                });
            }
            fields.push(
                {
                    type: 'checkbox',
                    id: 'recordOrigin',
                    label: $t('git.recordOrigin'),
                    defaultValue: false,
                    info: $t('git.recordOriginInfo'),
                },
                {
                    type: 'checkbox',
                    id: 'noCommit',
                    label: $t('git.noCommit'),
                    defaultValue: false,
                    info: $t('git.noCommitCherryInfo'),
                },
            );
            return [{
                kind: 'form',
                id: 'cherryPick',
                title: 'Cherry Pick',
                variant: 'cherryPick',
                commitHash: payload.hash as string,
                submitLabel: 'Cherry pick',
                fields,
            }];
        }
        case 'revertCommit':
            return [{
                kind: 'confirm',
                id: 'confirm',
                title: 'Revert',
                message: '',
                variant: 'revertCommit',
                commitHash: payload.hash as string,
                confirmLabel: 'Revert',
            }];
        case 'resetToCommit': {
            const branchName = ctx.branchHead && !ctx.branchHead.startsWith('(HEAD detached')
                ? ctx.branchHead
                : null;
            return [{
                kind: 'pick',
                id: 'mode',
                title: $t('git.resetBranch'),
                variant: 'resetMode',
                branchName,
                commitHash: payload.hash as string,
                submitLabel: $t('git.reset'),
                options: [
                    { value: 'soft', label: $t('git.softReset') },
                    { value: 'mixed', label: $t('git.mixedReset') },
                    { value: 'hard', label: $t('git.hardResetOption') },
                ],
            }];
        }
        case 'addTag': {
            const fields: FormField[] = [
                { type: 'text', id: 'tagName', label: $t('git.name'), placeholder: 'v1.0.0' },
                {
                    type: 'text',
                    id: 'message',
                    label: $t('git.tagMessage'),
                    placeholder: $t('git.optional'),
                },
            ];
            if (ctx.remotes.length > 1) {
                fields.push({
                    type: 'select',
                    id: 'pushToRemote',
                    label: $t('git.pushToRemote'),
                    defaultValue: '-1',
                    options: [
                        { value: '-1', label: $t('git.dontPush') },
                        ...ctx.remotes.map((remote, index) => ({ value: String(index), label: remote })),
                    ],
                });
            } else if (ctx.remotes.length === 1) {
                fields.push({
                    type: 'checkbox',
                    id: 'pushToRemote',
                    label: $t('git.pushToRemote'),
                    defaultValue: false,
                });
            }
            return [{
                kind: 'form',
                id: 'addTag',
                title: $t('git.addTag'),
                variant: 'addTag',
                commitHash: payload.hash as string,
                submitLabel: $t('git.addTag'),
                fields,
            }];
        }
        case 'pushTag': {
            const remoteFields: FormField[] = ctx.remotes.map((remote, index) => ({
                type: 'checkbox' as const,
                id: `remote_${remote}`,
                label: remote,
                defaultValue: index === 0,
            }));
            return [{
                kind: 'form',
                id: 'pushTag',
                title: $t('git.pushTagTitle', { tag: payload.tag as string }),
                variant: 'pushTag' as any,
                message: ctx.remotes.length > 1
                    ? $t('git.pushTagToRemote', { tag: payload.tag as string })
                    : $t('git.pushTagTo', { tag: payload.tag as string, remote: ctx.remotes[0] ?? '' }),
                submitLabel: $t('git.push'),
                fields: remoteFields,
            }];
        }
        case 'deleteTag': {
            const remoteFields: FormField[] = ctx.remotes.map((r) => ({
                type: 'checkbox' as const,
                id: `remote_${r}`,
                label: r,
                defaultValue: false,
            }));
            return [{
                kind: 'confirm',
                id: 'deleteTag',
                title: $t('git.deleteTagTitle'),
                message: $t('git.deleteTagConfirm', { tag: payload.tag as string }),
                confirmLabel: $t('common.delete'),
                danger: true,
                fields: remoteFields.length > 0 ? remoteFields : undefined,
            }];
        }
        case 'dropStash':
            return [{
                kind: 'confirm',
                id: 'confirm',
                title: $t('git.dropStashTitle'),
                message: $t('git.dropStashConfirm'),
                confirmLabel: $t('git.drop'),
                danger: true,
            }];
        case 'branchFromStash':
            return [{
                kind: 'input',
                id: 'branchName',
                title: $t('git.createBranchFromStash'),
                label: $t('git.branchName'),
                placeholder: 'branch-name',
            }];
        case 'pushStash':
            return [{
                kind: 'input',
                id: 'message',
                title: $t('git.stashChanges'),
                label: $t('git.stashMessage'),
                placeholder: 'WIP',
                optional: true,
            }];
        case 'resetUncommitted':
            return [{
                kind: 'confirm',
                id: 'confirm',
                title: $t('git.resetUncommitted'),
                message: $t('git.resetUncommittedConfirm', { mode: String(payload.mode) }),
                confirmLabel: $t('git.reset'),
                danger: payload.mode === 'hard',
            }];
        case 'cleanUntracked':
            return [{
                kind: 'confirm',
                id: 'confirm',
                title: $t('git.cleanUntracked'),
                message: $t('git.cleanUntrackedConfirm'),
                confirmLabel: $t('git.clean'),
                danger: true,
            }];
        default:
            return null;
    }
}

export function getFollowUpSteps(
    payload: GitActionRequest,
    step: PromptStep,
    answer: string,
): PromptStep[] {
    if (payload.action === 'resetToCommit' && step.kind === 'pick' && step.id === 'mode' && answer === 'hard') {
        return [{
            kind: 'confirm',
            id: 'hardConfirm',
            title: $t('git.hardReset'),
            message: $t('git.hardResetConfirm'),
            confirmLabel: $t('git.reset'),
            danger: true,
        }];
    }
    return [];
}

export function resolveGitActionPayload(
    base: GitActionRequest,
    answers: Record<string, string>,
): GitActionRequest | null {
    switch (base.action) {
        case 'createBranch': {
            const branchName = answers.branchName?.trim();
            if (!branchName) return null;
            return {
                ...base,
                branchName,
                checkout: answers.checkout === 'yes',
            };
        }
        case 'deleteBranch':
            return { ...base, force: answers.forceDelete === 'yes' };
        case 'renameBranch': {
            const newName = answers.newName?.trim();
            if (!newName || newName === base.branch) return null;
            return { ...base, newName };
        }
        case 'pushBranch': {
            const allRemotes = Array.isArray(base.remotes) ? base.remotes as string[]
                : (base.remote ? [base.remote as string] : []);
            const selectedRemotes = allRemotes.filter((r) => answers[`remote_${r}`] === 'yes');
            if (selectedRemotes.length === 0) return null;
            return { ...base, remotes: selectedRemotes, remote: selectedRemotes[0], force: answers.force === 'yes' };
        }
        case 'cherryPick': {
            const parents = Array.isArray(base.parents) ? base.parents as string[] : [];
            const parentIndex = parents.length > 1
                ? parseInt(answers.parentIndex ?? '1', 10)
                : 0;
            return {
                ...base,
                parentIndex,
                recordOrigin: answers.recordOrigin === 'yes',
                noCommit: answers.noCommit === 'yes',
            };
        }
        case 'merge':
            return {
                ...base,
                createNewCommit: answers.createNewCommit === 'yes',
                squash: answers.squash === 'yes',
                noCommit: answers.noCommit === 'yes',
            };
        case 'resetToCommit':
            if (!answers.mode) return null;
            return { ...base, mode: answers.mode };
        case 'addTag': {
            const tagName = answers.tagName?.trim();
            if (!tagName) return null;
            const remotes = Array.isArray(base.remotes) ? base.remotes as string[] : [];
            let pushToRemote: string | null = null;
            if (remotes.length > 1) {
                const index = answers.pushToRemote ?? '-1';
                pushToRemote = index !== '-1' ? remotes[parseInt(index, 10)] ?? null : null;
            } else if (remotes.length === 1 && answers.pushToRemote === 'yes') {
                pushToRemote = remotes[0];
            }
            return {
                ...base,
                tagName,
                annotated: true,
                message: answers.message?.trim() ?? '',
                pushToRemote,
            };
        }
        case 'pushTag': {
            const allRemotes = Array.isArray(base.remotes) ? base.remotes as string[]
                : (base.remote ? [base.remote as string] : []);
            const selectedRemotes = allRemotes.filter((r) => answers[`remote_${r}`] === 'yes');
            if (selectedRemotes.length === 0) return null;
            return { ...base, remotes: selectedRemotes, remote: selectedRemotes[0] };
        }
        case 'deleteTag': {
            const remotes = Array.isArray(base.remotes) ? base.remotes as string[] : [];
            const deleteFromRemotes = remotes.filter((r) => answers[`remote_${r}`] === 'yes');
            return { ...base, deleteFromRemotes };
        }
        case 'branchFromStash': {
            const branchName = answers.branchName?.trim();
            if (!branchName) return null;
            return { ...base, branchName };
        }
        case 'pushStash':
            return { ...base, message: answers.message ?? '' };
        default:
            return base;
    }
}
