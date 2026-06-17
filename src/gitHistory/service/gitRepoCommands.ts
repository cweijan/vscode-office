import * as path from 'path';
import * as vscode from 'vscode';
import type { GitFileStatus } from '../types/git';
import { UNCOMMITTED } from '../types/git';
import type { GitExecutor } from './gitExecutor';

export type GitResetMode = 'soft' | 'mixed' | 'hard';

export class GitRepoCommands {
    constructor(private readonly executor: GitExecutor) { }

    private async run(args: string[], repo: string): Promise<string | null> {
        try {
            await this.executor.spawn(args, repo, () => null);
            return null;
        } catch (e) {
            return e instanceof Error ? e.message : String(e);
        }
    }

    async checkoutBranch(repo: string, branchName: string, remoteTracking?: string): Promise<string | null> {
        const args = ['checkout'];
        if (remoteTracking) {
            args.push('-b', branchName, remoteTracking);
        } else {
            args.push(branchName);
        }
        return this.run(args, repo);
    }

    async checkoutCommit(repo: string, commitHash: string): Promise<string | null> {
        return this.run(['checkout', commitHash], repo);
    }

    async createBranch(
        repo: string,
        branchName: string,
        commitHash: string,
        checkout: boolean
    ): Promise<string | null> {
        if (checkout) {
            return this.run(['checkout', '-b', branchName, commitHash], repo);
        }
        return this.run(['branch', branchName, commitHash], repo);
    }

    async deleteBranch(repo: string, branchName: string, force: boolean): Promise<string | null> {
        return this.run(['branch', force ? '-D' : '-d', branchName], repo);
    }

    async deleteRemoteBranch(repo: string, branchName: string, remote: string): Promise<string | null> {
        const pushError = await this.run(['push', remote, '--delete', branchName], repo);
        if (pushError && /remote ref does not exist/i.test(pushError)) {
            return this.run(['branch', '-d', '-r', `${remote}/${branchName}`], repo);
        }
        return pushError;
    }

    async renameBranch(repo: string, oldName: string, newName: string): Promise<string | null> {
        return this.run(['branch', '-m', oldName, newName], repo);
    }

    async cherryPick(
        repo: string,
        commitHash: string,
        parentIndex = 0,
        recordOrigin = false,
        noCommit = false
    ): Promise<string | null> {
        const args = ['cherry-pick'];
        if (noCommit) args.push('--no-commit');
        if (recordOrigin) args.push('-x');
        if (parentIndex > 0) args.push('-m', String(parentIndex));
        args.push(commitHash);
        return this.run(args, repo);
    }

    async revertCommit(repo: string, commitHash: string, parentIndex = 0): Promise<string | null> {
        const args = ['revert', '--no-edit'];
        if (parentIndex > 0) args.push('-m', String(parentIndex));
        args.push(commitHash);
        return this.run(args, repo);
    }

    async resetToCommit(repo: string, commit: string, mode: GitResetMode): Promise<string | null> {
        return this.run(['reset', `--${mode}`, commit], repo);
    }

    async merge(repo: string, ref: string): Promise<string | null> {
        return this.run(['merge', ref], repo);
    }

    async pullBranch(
        repo: string,
        remote: string,
        branchName: string,
        options?: { noFastForward?: boolean; squash?: boolean },
    ): Promise<string | null> {
        const args = ['pull'];
        if (options?.noFastForward) args.push('--no-ff');
        if (options?.squash) args.push('--squash');
        args.push(remote, branchName);
        return this.run(args, repo);
    }

    async pushBranch(repo: string, remote: string, branchName: string, setUpstream: boolean): Promise<string | null> {
        const args = ['push'];
        if (setUpstream) args.push('-u');
        args.push(remote, branchName);
        return this.run(args, repo);
    }

    async deleteTag(repo: string, tagName: string): Promise<string | null> {
        return this.run(['tag', '-d', tagName], repo);
    }

    async addTag(
        repo: string,
        tagName: string,
        commitHash: string,
        annotated: boolean,
        message?: string,
    ): Promise<string | null> {
        const args = ['tag'];
        if (annotated) {
            args.push('-a', '-m', message?.trim() || tagName);
        }
        args.push(tagName, commitHash);
        return this.run(args, repo);
    }

    async pushTag(repo: string, tagName: string, remote: string): Promise<string | null> {
        return this.run(['push', remote, tagName], repo);
    }

    async applyStash(repo: string, selector: string): Promise<string | null> {
        return this.run(['stash', 'apply', selector], repo);
    }

    async popStash(repo: string, selector: string): Promise<string | null> {
        return this.run(['stash', 'pop', selector], repo);
    }

    async dropStash(repo: string, selector: string): Promise<string | null> {
        return this.run(['stash', 'drop', selector], repo);
    }

    async branchFromStash(repo: string, selector: string, branchName: string): Promise<string | null> {
        return this.run(['stash', 'branch', branchName, selector], repo);
    }

    async pushStash(repo: string, message: string, includeUntracked: boolean): Promise<string | null> {
        const args = ['stash', 'push'];
        if (message) args.push('-m', message);
        if (includeUntracked) args.push('-u');
        return this.run(args, repo);
    }

    async cleanUntracked(repo: string, directories: boolean): Promise<string | null> {
        const args = ['clean', '-f'];
        if (directories) args.push('-d');
        return this.run(args, repo);
    }

    copyToClipboard(text: string): void {
        void vscode.env.clipboard.writeText(text);
    }

    async openFile(repo: string, filePath: string): Promise<string | null> {
        const abs = path.join(repo, filePath);
        try {
            const doc = await vscode.workspace.openTextDocument(abs);
            await vscode.window.showTextDocument(doc, { preview: true });
            return null;
        } catch (e) {
            return e instanceof Error ? e.message : String(e);
        }
    }

    async viewScm(): Promise<string | null> {
        try {
            await vscode.commands.executeCommand('workbench.view.scm');
            return null;
        } catch (e) {
            return e instanceof Error ? e.message : String(e);
        }
    }

    async viewDiff(
        repo: string,
        fromHash: string,
        toHash: string,
        oldFilePath: string,
        newFilePath: string,
        type: GitFileStatus
    ): Promise<string | null> {
        if (type === 'U') {
            return this.openFile(repo, newFilePath);
        }

        const leftRef = fromHash === UNCOMMITTED ? 'HEAD' : fromHash;
        const leftHash = (fromHash === toHash && type !== 'A') ? `${leftRef}^` : leftRef;
        const leftUri = toGitUri(repo, oldFilePath, leftHash);
        const rightUri = toGitUri(repo, newFilePath, toHash === UNCOMMITTED ? '' : toHash);

        const fileName = path.basename(newFilePath);
        const title = `${fileName} (${abbrevHash(leftHash)} ↔ ${toHash === UNCOMMITTED ? 'Working Tree' : abbrevHash(toHash)})`;

        try {
            if (type === 'D') {
                await vscode.commands.executeCommand('vscode.open', leftUri, { preview: true });
                return null;
            }
            if (type === 'A') {
                await vscode.commands.executeCommand('vscode.open', rightUri, { preview: true });
                return null;
            }
            await vscode.commands.executeCommand('vscode.diff', leftUri, rightUri, title, { preview: true });
            return null;
        } catch (e) {
            return e instanceof Error ? e.message : String(e);
        }
    }

    async viewFileAtRevision(repo: string, hash: string, filePath: string): Promise<string | null> {
        const uri = toGitUri(repo, filePath, hash);
        try {
            await vscode.commands.executeCommand('vscode.open', uri, { preview: true });
            return null;
        } catch (e) {
            return e instanceof Error ? e.message : String(e);
        }
    }

    async copyFilePath(repo: string, filePath: string, absolute: boolean): Promise<string | null> {
        const value = absolute ? path.join(repo, filePath) : filePath;
        this.copyToClipboard(value);
        return null;
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
