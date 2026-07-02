import * as path from 'path';
import * as vscode from 'vscode';
import type { GitFileStatus } from '../types/git';
import { UNCOMMITTED } from '../types/git';
import type { GitExecutor } from './gitExecutor';

const EMPTY_TREE_HASH = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';

export type GitResetMode = 'soft' | 'mixed' | 'hard';

export interface GitCommandResult {
    error: string | null;
    warning: string | null;
}

export class GitRepoCommands {
    constructor(private readonly executor: GitExecutor) { }

    private async run(args: string[], repo: string): Promise<GitCommandResult> {
        try {
            const result = await this.executor.spawnWithWarning(args, repo, () => null);
            return { error: null, warning: result.warning };
        } catch (e) {
            return { error: e instanceof Error ? e.message : String(e), warning: null };
        }
    }

    async checkoutBranch(repo: string, branchName: string, remoteTracking?: string): Promise<GitCommandResult> {
        const args = ['checkout'];
        if (remoteTracking) {
            args.push('-b', branchName, remoteTracking);
        } else {
            args.push(branchName);
        }
        return this.run(args, repo);
    }

    async checkoutCommit(repo: string, commitHash: string): Promise<GitCommandResult> {
        return this.run(['checkout', commitHash], repo);
    }

    async createBranch(
        repo: string,
        branchName: string,
        commitHash: string,
        checkout: boolean
    ): Promise<GitCommandResult> {
        if (checkout) {
            return this.run(['checkout', '-b', branchName, commitHash], repo);
        }
        return this.run(['branch', branchName, commitHash], repo);
    }

    async deleteBranch(repo: string, branchName: string, force: boolean): Promise<GitCommandResult> {
        return this.run(['branch', force ? '-D' : '-d', branchName], repo);
    }

    async deleteRemoteBranch(repo: string, branchName: string, remote: string): Promise<GitCommandResult> {
        const pushResult = await this.run(['push', remote, '--delete', branchName], repo);
        if (pushResult.error && /remote ref does not exist/i.test(pushResult.error)) {
            return this.run(['branch', '-d', '-r', `${remote}/${branchName}`], repo);
        }
        return pushResult;
    }

    async renameBranch(repo: string, oldName: string, newName: string): Promise<GitCommandResult> {
        return this.run(['branch', '-m', oldName, newName], repo);
    }

    async cherryPick(
        repo: string,
        commitHash: string,
        parentIndex = 0,
        recordOrigin = false,
        noCommit = false
    ): Promise<GitCommandResult> {
        const args = ['cherry-pick'];
        if (noCommit) args.push('--no-commit');
        if (recordOrigin) args.push('-x');
        if (parentIndex > 0) args.push('-m', String(parentIndex));
        args.push(commitHash);
        return this.run(args, repo);
    }

    async revertCommit(repo: string, commitHash: string, parentIndex = 0): Promise<GitCommandResult> {
        const args = ['revert', '--no-edit'];
        if (parentIndex > 0) args.push('-m', String(parentIndex));
        args.push(commitHash);
        return this.run(args, repo);
    }

    async resetToCommit(repo: string, commit: string, mode: GitResetMode): Promise<GitCommandResult> {
        return this.run(['reset', `--${mode}`, commit], repo);
    }

    async merge(
        repo: string,
        ref: string,
        options?: { createNewCommit?: boolean; squash?: boolean; noCommit?: boolean },
    ): Promise<GitCommandResult> {
        const args = ['merge', ref];
        if (options?.squash) {
            args.push('--squash');
        } else if (options?.createNewCommit) {
            args.push('--no-ff');
        }
        if (options?.noCommit) {
            args.push('--no-commit');
        }
        return this.run(args, repo);
    }

    async pullBranch(
        repo: string,
        remote: string,
        branchName: string,
        options?: { noFastForward?: boolean; squash?: boolean },
    ): Promise<GitCommandResult> {
        const args = ['pull'];
        if (options?.noFastForward) args.push('--no-ff');
        if (options?.squash) args.push('--squash');
        args.push(remote, branchName);
        return this.run(args, repo);
    }

    async pushBranch(
        repo: string,
        remote: string,
        branchName: string,
        setUpstream: boolean,
        force = false,
    ): Promise<GitCommandResult> {
        const args = ['push'];
        if (force) {
            args.push('--force-with-lease');
        }
        if (setUpstream) {
            args.push('-u');
        }
        args.push(remote, branchName);
        return this.run(args, repo);
    }

    async deleteTag(repo: string, tagName: string): Promise<GitCommandResult> {
        return this.run(['tag', '-d', tagName], repo);
    }

    async addTag(
        repo: string,
        tagName: string,
        commitHash: string,
        annotated: boolean,
        message?: string,
    ): Promise<GitCommandResult> {
        const args = ['tag'];
        if (annotated) {
            args.push('-a', '-m', message?.trim() || tagName);
        }
        args.push(tagName, commitHash);
        return this.run(args, repo);
    }

    async pushTag(repo: string, tagName: string, remote: string): Promise<GitCommandResult> {
        return this.run(['push', remote, tagName], repo);
    }

    async applyStash(repo: string, selector: string): Promise<GitCommandResult> {
        return this.run(['stash', 'apply', selector], repo);
    }

    async popStash(repo: string, selector: string): Promise<GitCommandResult> {
        return this.run(['stash', 'pop', selector], repo);
    }

    async dropStash(repo: string, selector: string): Promise<GitCommandResult> {
        return this.run(['stash', 'drop', selector], repo);
    }

    async branchFromStash(repo: string, selector: string, branchName: string): Promise<GitCommandResult> {
        return this.run(['stash', 'branch', branchName, selector], repo);
    }

    async pushStash(repo: string, message: string, includeUntracked: boolean): Promise<GitCommandResult> {
        const args = ['stash', 'push'];
        if (message) args.push('-m', message);
        if (includeUntracked) args.push('-u');
        return this.run(args, repo);
    }

    async cleanUntracked(repo: string, directories: boolean): Promise<GitCommandResult> {
        const args = ['clean', '-f'];
        if (directories) args.push('-d');
        return this.run(args, repo);
    }

    copyToClipboard(text: string): void {
        void vscode.env.clipboard.writeText(text);
    }

    async openFile(repo: string, filePath: string): Promise<GitCommandResult> {
        const abs = path.join(repo, filePath);
        try {
            await vscode.commands.executeCommand('vscode.open', vscode.Uri.file(abs), { preview: true });
            return { error: null, warning: null };
        } catch (e) {
            return { error: e instanceof Error ? e.message : String(e), warning: null };
        }
    }

    async viewScm(): Promise<GitCommandResult> {
        try {
            await vscode.commands.executeCommand('workbench.view.scm');
            return { error: null, warning: null };
        } catch (e) {
            return { error: e instanceof Error ? e.message : String(e), warning: null };
        }
    }

    async viewDiff(
        repo: string,
        fromHash: string,
        toHash: string,
        oldFilePath: string,
        newFilePath: string,
        type: GitFileStatus
    ): Promise<GitCommandResult> {
        if (type === 'U') {
            return this.openFile(repo, newFilePath);
        }

        const isWorkingTree = toHash === UNCOMMITTED;
        const leftRef = fromHash === UNCOMMITTED ? 'HEAD' : fromHash;
        const leftHash = isWorkingTree
            ? 'HEAD'
            : (fromHash === toHash && fromHash !== EMPTY_TREE_HASH && type !== 'A') ? `${leftRef}^` : leftRef;
        const leftUri = toGitUri(repo, oldFilePath, leftHash);
        const rightUri = isWorkingTree
            ? toWorkingTreeUri(repo, newFilePath)
            : toGitUri(repo, newFilePath, toHash);

        const fileName = path.basename(newFilePath);
        const title = `${fileName} (${abbrevHash(leftHash)} ↔ ${toHash === UNCOMMITTED ? 'Working Tree' : abbrevHash(toHash)})`;

        try {
            if (type === 'D') {
                await vscode.commands.executeCommand('vscode.open', leftUri, { preview: true });
                return { error: null, warning: null };
            }
            if (type === 'A') {
                await vscode.commands.executeCommand('vscode.open', rightUri, { preview: true });
                return { error: null, warning: null };
            }
            await vscode.commands.executeCommand('vscode.diff', leftUri, rightUri, title, { preview: true });
            return { error: null, warning: null };
        } catch (e) {
            return { error: e instanceof Error ? e.message : String(e), warning: null };
        }
    }

    async viewFileAtRevision(repo: string, hash: string, filePath: string): Promise<GitCommandResult> {
        if (hash === UNCOMMITTED) {
            return this.openFile(repo, filePath);
        }
        const uri = toGitUri(repo, filePath, hash);
        try {
            await vscode.commands.executeCommand('vscode.open', uri, { preview: true });
            return { error: null, warning: null };
        } catch (e) {
            return { error: e instanceof Error ? e.message : String(e), warning: null };
        }
    }

    async copyFilePath(repo: string, filePath: string, absolute: boolean): Promise<GitCommandResult> {
        const value = absolute ? path.join(repo, filePath) : filePath;
        this.copyToClipboard(value);
        return { error: null, warning: null };
    }
}

function abbrevHash(hash: string): string {
    return hash.length > 8 ? hash.substring(0, 8) : hash;
}

export function toGitUri(repo: string, filePath: string, ref: string): vscode.Uri {
    const normalizedPath = filePath.replace(/\\/g, '/');
    const absPath = path.normalize(path.join(repo, normalizedPath));
    const fileUri = vscode.Uri.file(absPath);
    return fileUri.with({
        scheme: 'git',
        query: JSON.stringify({ path: fileUri.fsPath, ref }),
    });
}

export function toWorkingTreeUri(repo: string, filePath: string): vscode.Uri {
    const normalizedPath = filePath.replace(/\\/g, '/');
    return vscode.Uri.file(path.normalize(path.join(repo, normalizedPath)));
}
