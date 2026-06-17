export type FormField =
    | { type: 'text'; id: string; label: string; placeholder?: string; defaultValue?: string }
    | { type: 'checkbox'; id: string; label: string; defaultValue?: boolean };

export type PromptStep =
    | {
        kind: 'confirm';
        id: string;
        title: string;
        message: string;
        confirmLabel: string;
        danger?: boolean;
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
    }
    | {
        kind: 'form';
        id: string;
        title: string;
        message?: string;
        submitLabel: string;
        fields: FormField[];
    };

export type GitActionRequest = Record<string, unknown> & { action: string };

export type PromptSubmitValue = string | Record<string, string>;

function abbrevHash(hash: string): string {
    return hash === '*' ? '*' : hash.substring(0, 8);
}

export function getPromptSteps(
    payload: GitActionRequest,
    ctx: { remotes: string[] },
): PromptStep[] | null {
    switch (payload.action) {
        case 'createBranch':
            return [{
                kind: 'form',
                id: 'createBranch',
                title: 'Create Branch',
                message: `Create branch at commit ${abbrevHash(payload.hash as string)}:`,
                submitLabel: 'Create Branch',
                fields: [
                    { type: 'text', id: 'branchName', label: 'Name', placeholder: 'branch-name' },
                    { type: 'checkbox', id: 'checkout', label: 'Check out', defaultValue: false },
                ],
            }];
        case 'deleteBranch':
            return [{
                kind: 'pick',
                id: 'deleteMode',
                title: 'Delete Branch',
                message: `Delete branch "${payload.branch}"?`,
                options: [
                    { value: 'normal', label: 'Delete' },
                    { value: 'force', label: 'Force Delete', description: 'Force delete even if not fully merged' },
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
        case 'merge':
            return [{
                kind: 'confirm',
                id: 'confirm',
                title: 'Merge',
                message: `Merge "${payload.ref}" into the current branch?`,
                confirmLabel: 'Merge',
            }];
        case 'cherryPick':
            return [{
                kind: 'confirm',
                id: 'confirm',
                title: 'Cherry Pick',
                message: `Cherry pick commit ${abbrevHash(payload.hash as string)}?`,
                confirmLabel: 'Cherry Pick',
            }];
        case 'revertCommit':
            return [{
                kind: 'confirm',
                id: 'confirm',
                title: 'Revert',
                message: `Revert commit ${abbrevHash(payload.hash as string)}?`,
                confirmLabel: 'Revert',
            }];
        case 'resetToCommit':
            return [{
                kind: 'pick',
                id: 'mode',
                title: 'Reset Branch',
                message: `Reset current branch to ${abbrevHash(payload.hash as string)}`,
                options: [
                    { value: 'soft', label: 'Soft — keep changes staged' },
                    { value: 'mixed', label: 'Mixed — keep working tree' },
                    { value: 'hard', label: 'Hard — discard all changes' },
                ],
            }];
        case 'addTag':
            return [
                {
                    kind: 'input',
                    id: 'tagName',
                    title: 'Add Tag',
                    label: 'Tag name',
                    placeholder: 'v1.0.0',
                },
                {
                    kind: 'pick',
                    id: 'annotated',
                    title: 'Tag Type',
                    options: [
                        { value: 'lightweight', label: 'Lightweight' },
                        { value: 'annotated', label: 'Annotated' },
                    ],
                },
            ];
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
    if (payload.action === 'addTag' && step.kind === 'pick' && step.id === 'annotated' && answer === 'annotated') {
        return [{
            kind: 'input',
            id: 'message',
            title: 'Tag Message',
            label: 'Annotation message',
            placeholder: 'Optional — defaults to tag name',
            optional: true,
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
            return { ...base, force: answers.deleteMode === 'force' };
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
        case 'resetToCommit':
            if (!answers.mode) return null;
            return { ...base, mode: answers.mode };
        case 'addTag': {
            const tagName = answers.tagName?.trim();
            if (!tagName) return null;
            return {
                ...base,
                tagName,
                annotated: answers.annotated === 'annotated',
                message: answers.message?.trim() ?? '',
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
