import type { GitActionPayload, GitActionResult } from '../types/gitActions';
import { GitRepoCommands, type GitCommandResult } from '../service/gitRepoCommands';

const MUTATING_ACTIONS = new Set([
    'checkoutBranch', 'checkoutCommit', 'createBranch', 'deleteBranch', 'renameBranch',
    'deleteRemoteBranch', 'pullBranch', 'pushBranch', 'merge', 'cherryPick', 'revertCommit',
    'resetToCommit', 'addTag', 'deleteTag', 'pushTag', 'applyStash', 'popStash', 'dropStash',
    'branchFromStash', 'pushStash', 'resetUncommitted', 'cleanUntracked',
]);

export class GitActionHandler {
    constructor(private readonly commands: GitRepoCommands) { }

    async handle(payload: GitActionPayload): Promise<GitActionResult> {
        const result = await this.dispatch(payload);
        return {
            error: result.error,
            warning: result.warning,
            refresh: result.error === null && this.shouldRefresh(payload),
        };
    }

    private shouldRefresh(payload: GitActionPayload): boolean {
        if (!MUTATING_ACTIONS.has(payload.action)) {
            return false;
        }
        if (payload.action === 'checkoutBranch' || payload.action === 'checkoutCommit') {
            return false;
        }
        if (payload.action === 'createBranch' && payload.checkout) {
            return false;
        }
        return true;
    }

    private async dispatch(payload: GitActionPayload): Promise<GitCommandResult> {
        switch (payload.action) {
            case 'copyToClipboard':
                this.commands.copyToClipboard(payload.text);
                return { error: null, warning: null };
            case 'checkoutBranch':
                return this.commands.checkoutBranch(payload.repo, payload.branch, payload.remoteTracking);
            case 'checkoutCommit':
                return this.commands.checkoutCommit(payload.repo, payload.hash);
            case 'createBranch':
                return this.commands.createBranch(
                    payload.repo,
                    payload.branchName,
                    payload.hash,
                    payload.checkout,
                );
            case 'deleteBranch':
                return this.commands.deleteBranch(payload.repo, payload.branch, payload.force);
            case 'renameBranch':
                return this.commands.renameBranch(payload.repo, payload.branch, payload.newName);
            case 'deleteRemoteBranch':
                return this.commands.deleteRemoteBranch(payload.repo, payload.branch, payload.remote);
            case 'pullBranch':
                return this.commands.pullBranch(
                    payload.repo,
                    payload.remote,
                    payload.branch,
                    {
                        noFastForward: payload.noFastForward,
                        squash: payload.squash,
                    },
                );
            case 'pushBranch': {
                const targets = payload.remotes?.length ? payload.remotes : (payload.remote ? [payload.remote] : []);
                let warning: string | null = null;
                for (const remote of targets) {
                    const result = await this.commands.pushBranch(payload.repo, remote, payload.branch, true, payload.force);
                    if (result.error) return result;
                    warning ??= result.warning;
                }
                return { error: null, warning };
            }
            case 'merge':
                return this.commands.merge(
                    payload.repo,
                    payload.ref,
                    {
                        createNewCommit: payload.createNewCommit,
                        squash: payload.squash,
                        noCommit: payload.noCommit,
                    },
                );
            case 'cherryPick':
                return this.commands.cherryPick(
                    payload.repo,
                    payload.hash,
                    payload.parentIndex ?? 0,
                    payload.recordOrigin ?? false,
                    payload.noCommit ?? false,
                );
            case 'revertCommit':
                return this.commands.revertCommit(payload.repo, payload.hash, payload.parentIndex ?? 0);
            case 'resetToCommit':
                return this.commands.resetToCommit(payload.repo, payload.hash, payload.mode);
            case 'addTag': {
                const addResult = await this.commands.addTag(
                    payload.repo,
                    payload.tagName,
                    payload.hash,
                    payload.annotated,
                    payload.message,
                );
                if (addResult.error) {
                    return addResult;
                }
                if (payload.pushToRemote) {
                    const pushResult = await this.commands.pushTag(payload.repo, payload.tagName, payload.pushToRemote);
                    return {
                        error: pushResult.error,
                        warning: addResult.warning ?? pushResult.warning,
                    };
                }
                return addResult;
            }
            case 'deleteTag': {
                const deleteResult = await this.commands.deleteTag(payload.repo, payload.tag);
                if (deleteResult.error) return deleteResult;
                let warning = deleteResult.warning;
                for (const remote of (payload.deleteFromRemotes ?? [])) {
                    const result = await this.commands.pushTag(payload.repo, `:refs/tags/${payload.tag}`, remote);
                    if (result.error) return result;
                    warning ??= result.warning;
                }
                return { error: null, warning };
            }
            case 'pushTag': {
                const targets = payload.remotes?.length ? payload.remotes : (payload.remote ? [payload.remote] : []);
                let warning: string | null = null;
                for (const remote of targets) {
                    const result = await this.commands.pushTag(payload.repo, payload.tag, remote);
                    if (result.error) return result;
                    warning ??= result.warning;
                }
                return { error: null, warning };
            }
            case 'applyStash':
                return this.commands.applyStash(payload.repo, payload.selector);
            case 'popStash':
                return this.commands.popStash(payload.repo, payload.selector);
            case 'dropStash':
                return this.commands.dropStash(payload.repo, payload.selector);
            case 'branchFromStash':
                return this.commands.branchFromStash(payload.repo, payload.selector, payload.branchName);
            case 'pushStash':
                return this.commands.pushStash(payload.repo, payload.message, true);
            case 'resetUncommitted':
                return this.commands.resetToCommit(payload.repo, 'HEAD', payload.mode);
            case 'cleanUntracked':
                return this.commands.cleanUntracked(payload.repo, payload.directories);
            case 'viewScm':
                return this.commands.viewScm();
            case 'openFile':
                return this.commands.openFile(payload.repo, payload.filePath);
            case 'viewFileAtRevision':
                return this.commands.viewFileAtRevision(payload.repo, payload.hash, payload.filePath);
            case 'viewDiff':
                return this.commands.viewDiff(
                    payload.repo,
                    payload.fromHash,
                    payload.toHash,
                    payload.oldFilePath,
                    payload.newFilePath,
                    payload.type,
                );
            case 'viewDiffWithWorking':
                return this.commands.viewDiff(
                    payload.repo,
                    payload.hash,
                    '*',
                    payload.filePath,
                    payload.filePath,
                    'M',
                );
            case 'copyFilePath':
                return this.commands.copyFilePath(payload.repo, payload.filePath, payload.absolute);
            default:
                return { error: 'Unknown action', warning: null };
        }
    }
}
