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
        variant?: 'resetMode';
        branchName?: string | null;
        commitHash?: string;
        submitLabel?: string;
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
                title: 'Create Branch',
                variant: 'createBranch',
                commitHash: payload.hash as string,
                submitLabel: 'Create Branch',
                fields: [
                    { type: 'text', id: 'branchName', label: 'Name', placeholder: 'branch-name' },
                    { type: 'checkbox', id: 'checkout', label: 'Check out', defaultValue: false },
                ],
            }];
        case 'deleteBranch':
            return [{
                kind: 'form',
                id: 'deleteBranch',
                title: 'Delete Branch',
                variant: 'deleteBranch',
                branchName: payload.branch as string,
                submitLabel: 'Delete',
                fields: [
                    { type: 'checkbox', id: 'forceDelete', label: 'Force Delete', defaultValue: false },
                ],
            }];
        case 'renameBranch':
            return [{
                kind: 'input',
                id: 'newName',
                title: 'Rename Branch',
                label: 'New branch name',
                defaultValue: payload.branch as string,
            }];
        case 'deleteRemoteBranch':
            return [{
                kind: 'confirm',
                id: 'confirm',
                title: 'Delete Remote Branch',
                message: `Delete remote branch "${payload.remote}/${payload.branch}"?`,
                confirmLabel: 'Delete',
                danger: true,
            }];
        case 'pushBranch':
            if (ctx.remotes.length > 1) {
                return [{
                    kind: 'pick',
                    id: 'remote',
                    title: 'Push Branch',
                    message: `Push "${payload.branch}" to remote`,
                    options: ctx.remotes.map((remote) => ({ value: remote, label: remote })),
                }];
            }
            return null;
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
                title: 'Merge',
                variant: 'merge',
                mergeOn,
                mergeTarget,
                branchName,
                submitLabel: 'Merge',
                fields: [
                    {
                        type: 'checkbox',
                        id: 'createNewCommit',
                        label: 'Create a new commit even if fast-forward is possible',
                        defaultValue: true,
                    },
                    {
                        type: 'checkbox',
                        id: 'squash',
                        label: 'Squash Commits',
                        defaultValue: false,
                        info: `Create a single commit on the current branch whose effect is the same as merging this ${mergeKind}.`,
                    },
                    {
                        type: 'checkbox',
                        id: 'noCommit',
                        label: 'No Commit',
                        defaultValue: false,
                        info: 'The changes of the merge will be staged but not committed, so that you can review and/or modify the merge result before committing.',
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
                    label: 'Parent Hash',
                    defaultValue: '1',
                    info: 'Choose the parent hash on the main branch, to cherry pick the commit relative to.',
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
                    label: 'Record Origin',
                    defaultValue: false,
                    info: 'Record that this commit was the origin of the cherry pick by appending a line to the original commit message that states "(cherry picked from commit ...)".',
                },
                {
                    type: 'checkbox',
                    id: 'noCommit',
                    label: 'No Commit',
                    defaultValue: false,
                    info: 'Cherry picked changes will be staged but not committed, so that you can select and commit specific parts of this commit.',
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
                title: 'Reset Branch',
                variant: 'resetMode',
                branchName,
                commitHash: payload.hash as string,
                submitLabel: 'Reset',
                options: [
                    { value: 'soft', label: 'Soft - Keep all changes, but reset head' },
                    { value: 'mixed', label: 'Mixed - Keep working tree, but reset index' },
                    { value: 'hard', label: 'Hard - Discard all changes' },
                ],
            }];
        }
        case 'addTag': {
            const fields: FormField[] = [
                { type: 'text', id: 'tagName', label: 'Name', placeholder: 'v1.0.0' },
                {
                    type: 'text',
                    id: 'message',
                    label: 'Message',
                    placeholder: 'Optional',
                },
            ];
            if (ctx.remotes.length > 1) {
                fields.push({
                    type: 'select',
                    id: 'pushToRemote',
                    label: 'Push to remote',
                    defaultValue: '-1',
                    options: [
                        { value: '-1', label: "Don't push" },
                        ...ctx.remotes.map((remote, index) => ({ value: String(index), label: remote })),
                    ],
                });
            } else if (ctx.remotes.length === 1) {
                fields.push({
                    type: 'checkbox',
                    id: 'pushToRemote',
                    label: 'Push to remote',
                    defaultValue: false,
                });
            }
            return [{
                kind: 'form',
                id: 'addTag',
                title: 'Add Tag',
                variant: 'addTag',
                commitHash: payload.hash as string,
                submitLabel: 'Add Tag',
                fields,
            }];
        }
        case 'deleteTag':
            return [{
                kind: 'confirm',
                id: 'confirm',
                title: 'Delete Tag',
                message: `Delete tag "${payload.tag}"?`,
                confirmLabel: 'Delete',
                danger: true,
            }];
        case 'dropStash':
            return [{
                kind: 'confirm',
                id: 'confirm',
                title: 'Drop Stash',
                message: 'Drop this stash?',
                confirmLabel: 'Drop',
                danger: true,
            }];
        case 'branchFromStash':
            return [{
                kind: 'input',
                id: 'branchName',
                title: 'Create Branch from Stash',
                label: 'Branch name',
                placeholder: 'branch-name',
            }];
        case 'pushStash':
            return [{
                kind: 'input',
                id: 'message',
                title: 'Stash Changes',
                label: 'Stash message (optional)',
                placeholder: 'WIP',
                optional: true,
            }];
        case 'resetUncommitted':
            return [{
                kind: 'confirm',
                id: 'confirm',
                title: 'Reset Uncommitted Changes',
                message: `Reset uncommitted changes (${payload.mode})?`,
                confirmLabel: 'Reset',
                danger: payload.mode === 'hard',
            }];
        case 'cleanUntracked':
            return [{
                kind: 'confirm',
                id: 'confirm',
                title: 'Clean Untracked Files',
                message: 'Clean untracked files and directories?',
                confirmLabel: 'Clean',
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
            title: 'Hard Reset',
            message: 'Hard reset will discard all uncommitted changes. Continue?',
            confirmLabel: 'Reset',
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
        case 'pushBranch':
            if (answers.remote) {
                return { ...base, remote: answers.remote };
            }
            return base;
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
