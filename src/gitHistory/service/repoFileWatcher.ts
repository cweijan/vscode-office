import * as vscode from 'vscode';
import { normalizeRepoPath } from '../util/repoPath';

const FILE_CHANGE_REGEX = /(^\.git\/(config|index|HEAD|refs\/stash|refs\/heads\/.*|refs\/remotes\/.*|refs\/tags\/.*)$)|(^(?!\.git).*$)|(^\.git[^/]+$)/;

/**
 * Watches a Git repository for file events and invokes a debounced callback.
 */
export class RepoFileWatcher {
    private repo: string | null = null;
    private fsWatcher: vscode.FileSystemWatcher | null = null;
    private refreshTimeout: ReturnType<typeof setTimeout> | null = null;
    private muted = false;
    private resumeAt = 0;

    constructor(private readonly repoChangeCallback: () => void) { }

    start(repo: string): void {
        if (this.fsWatcher !== null) {
            this.stop();
        }
        this.repo = repo;
        this.fsWatcher = vscode.workspace.createFileSystemWatcher(repo + '/**');
        this.fsWatcher.onDidCreate((uri) => this.refresh(uri));
        this.fsWatcher.onDidChange((uri) => this.refresh(uri));
        this.fsWatcher.onDidDelete((uri) => this.refresh(uri));
    }

    stop(): void {
        if (this.fsWatcher !== null) {
            this.fsWatcher.dispose();
            this.fsWatcher = null;
        }
        if (this.refreshTimeout !== null) {
            clearTimeout(this.refreshTimeout);
            this.refreshTimeout = null;
        }
        this.repo = null;
    }

    mute(): void {
        this.muted = true;
    }

    unmute(): void {
        this.muted = false;
        this.resumeAt = Date.now() + 1500;
    }

    private refresh(uri: vscode.Uri): void {
        if (this.muted || !this.repo) {
            return;
        }
        const repoPrefix = normalizeRepoPath(this.repo) + '/';
        const relativePath = normalizeRepoPath(uri.fsPath).replace(repoPrefix, '');
        if (!relativePath.match(FILE_CHANGE_REGEX)) {
            return;
        }
        if (Date.now() < this.resumeAt) {
            return;
        }
        if (this.refreshTimeout !== null) {
            clearTimeout(this.refreshTimeout);
        }
        this.refreshTimeout = setTimeout(() => {
            this.refreshTimeout = null;
            this.repoChangeCallback();
        }, 750);
    }
}
