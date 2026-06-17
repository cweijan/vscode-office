import type { GitExecutor } from './gitExecutor';
import type { GitRemoteDetail, RemoteActionPayload, RemoteActionResult, RemoteWebUrl } from '../types/repoConfig';

export type { RemoteWebUrl };

function convertRemoteUrlToWebUrl(url: string): string | null {
    const trimmed = url.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('git@')) {
        return trimmed.replace(':', '/').replace('git@', 'https://').replace(/\.git$/, '');
    }
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return trimmed.replace(/\.git$/, '');
    }
    return null;
}

export class GitActions {
    constructor(private readonly executor: GitExecutor) { }

    async fetchFromRemotes(repo: string): Promise<string | null> {
        try {
            await this.executor.spawn(['fetch', '--all', '--prune'], repo, () => null);
            return null;
        } catch (e) {
            return e instanceof Error ? e.message : String(e);
        }
    }

    async pushCurrentBranch(
        repo: string,
        branch: string,
        remote: string,
    ): Promise<string | null> {
        try {
            await this.executor.spawn(['push', '-u', remote, branch], repo, () => null);
            return null;
        } catch (e) {
            return e instanceof Error ? e.message : String(e);
        }
    }

    async quickSync(
        repo: string,
        branch: string,
        remote: string,
        commitMessage: string,
        options?: { noFastForward?: boolean; squash?: boolean },
    ): Promise<string | null> {
        try {
            const dirty = await this.executor.spawn(
                ['status', '--porcelain'],
                repo,
                (stdout) => stdout.trim().length > 0,
            );
            if (dirty) {
                await this.executor.spawn(['add', '-A'], repo, () => null);
                const message = commitMessage.trim() || 'Quick Sync';
                try {
                    await this.executor.spawn(['commit', '-m', message], repo, () => null);
                } catch (e) {
                    const errorMessage = e instanceof Error ? e.message : String(e);
                    if (!/nothing to commit/i.test(errorMessage)) {
                        throw e;
                    }
                }
            }

            const pullArgs = ['pull'];
            if (options?.noFastForward) {
                pullArgs.push('--no-ff');
            }
            if (options?.squash) {
                pullArgs.push('--squash');
            }
            pullArgs.push(remote, branch);
            await this.executor.spawn(pullArgs, repo, () => null);
            await this.executor.spawn(['push', remote, branch], repo, () => null);
            return null;
        } catch (e) {
            return e instanceof Error ? e.message : String(e);
        }
    }

    async getRemoteWebUrls(repo: string, remoteNames?: ReadonlyArray<string>): Promise<RemoteWebUrl[]> {
        const remotes = remoteNames ?? await this.executor.spawn(['remote'], repo, (stdout) =>
            stdout.split(/\r\n|\r|\n/).filter((line) => line.length > 0)
        );
        const urls = await Promise.all(remotes.map(async (remote) => {
            try {
                const url = await this.executor.spawn(
                    ['config', '--get', `remote.${remote}.url`],
                    repo,
                    (stdout) => stdout.trim(),
                );
                const webUrl = convertRemoteUrlToWebUrl(url);
                if (webUrl) {
                    return { name: remote, url: webUrl };
                }
            } catch { /* skip */ }
            return null;
        }));
        const result: RemoteWebUrl[] = [];
        for (const entry of urls) {
            if (entry) {
                result.push(entry);
            }
        }
        return result;
    }

    async openRemoteUrl(url: string): Promise<string | null> {
        try {
            const vscode = await import('vscode');
            await vscode.env.openExternal(vscode.Uri.parse(url));
            return null;
        } catch (e) {
            return e instanceof Error ? e.message : String(e);
        }
    }

    async getRepoRemotes(repo: string): Promise<GitRemoteDetail[]> {
        const names = await this.executor.spawn(['remote'], repo, (stdout) =>
            stdout.split(/\r\n|\r|\n/).filter((line) => line.length > 0)
        );
        const remotes: GitRemoteDetail[] = [];
        for (const name of names) {
            let url: string | null = null;
            let pushUrl: string | null = null;
            try {
                url = await this.executor.spawn(
                    ['config', '--get', `remote.${name}.url`],
                    repo,
                    (stdout) => stdout.trim() || null,
                );
            } catch { /* not set */ }
            try {
                pushUrl = await this.executor.spawn(
                    ['config', '--get', `remote.${name}.pushurl`],
                    repo,
                    (stdout) => stdout.trim() || null,
                );
            } catch { /* not set */ }
            remotes.push({ name, url, pushUrl });
        }
        return remotes;
    }

    async manageRemote(payload: RemoteActionPayload): Promise<RemoteActionResult> {
        switch (payload.action) {
            case 'add':
                return this.addRemote(payload.repo, payload.name, payload.url, payload.pushUrl);
            case 'edit':
                return this.editRemote(
                    payload.repo,
                    payload.name,
                    payload.newName,
                    payload.url,
                    payload.pushUrl,
                );
            case 'delete':
                return this.deleteRemote(payload.repo, payload.name);
            default:
                return { error: 'Unknown remote action', cancelled: false };
        }
    }

    private async addRemote(
        repo: string,
        name: string,
        url: string,
        pushUrl?: string,
    ): Promise<RemoteActionResult> {
        try {
            await this.executor.spawn(['remote', 'add', name, url], repo, () => null);
            if (pushUrl?.trim()) {
                await this.executor.spawn(
                    ['remote', 'set-url', '--push', name, pushUrl.trim()],
                    repo,
                    () => null,
                );
            }
            return { error: null, cancelled: false };
        } catch (e) {
            return {
                error: e instanceof Error ? e.message : String(e),
                cancelled: false,
            };
        }
    }

    private async editRemote(
        repo: string,
        currentName: string,
        newName: string,
        url: string,
        pushUrl?: string,
    ): Promise<RemoteActionResult> {
        try {
            if (newName !== currentName) {
                await this.executor.spawn(['remote', 'rename', currentName, newName], repo, () => null);
            }
            await this.executor.spawn(['remote', 'set-url', newName, url], repo, () => null);
            if (pushUrl?.trim()) {
                await this.executor.spawn(
                    ['remote', 'set-url', '--push', newName, pushUrl.trim()],
                    repo,
                    () => null,
                );
            } else {
                try {
                    await this.executor.spawn(
                        ['remote', 'set-url', '--push', '--delete', newName],
                        repo,
                        () => null,
                    );
                } catch { /* no push url configured */ }
            }
            return { error: null, cancelled: false };
        } catch (e) {
            return {
                error: e instanceof Error ? e.message : String(e),
                cancelled: false,
            };
        }
    }

    private async deleteRemote(repo: string, remoteName: string): Promise<RemoteActionResult> {
        try {
            await this.executor.spawn(['remote', 'remove', remoteName], repo, () => null);
            return { error: null, cancelled: false };
        } catch (e) {
            return {
                error: e instanceof Error ? e.message : String(e),
                cancelled: false,
            };
        }
    }
}
