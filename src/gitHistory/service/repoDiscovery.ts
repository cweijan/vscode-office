import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { normalizeRepoPath } from '../util/repoPath';
import type { GitExecutor } from './gitExecutor';

const DEFAULT_MAX_DEPTH = 2;

interface GitRepository {
    rootUri: vscode.Uri;
}

interface GitApi {
    repositories: ReadonlyArray<GitRepository>;
    onDidOpenRepository: vscode.Event<GitRepository>;
    onDidCloseRepository: vscode.Event<GitRepository>;
}

interface GitExtensionExports {
    getAPI(version: 1): GitApi;
}

async function getGitApi(): Promise<GitApi | null> {
    const extension = vscode.extensions.getExtension<GitExtensionExports>('vscode.git');
    if (!extension) {
        return null;
    }
    if (!extension.isActive) {
        try {
            await extension.activate();
        } catch {
            return null;
        }
    }
    return extension.exports?.getAPI(1) ?? null;
}

async function isGitRepo(dir: string, executor: GitExecutor): Promise<string | null> {
    const gitDir = path.join(dir, '.git');
    if (!fs.existsSync(gitDir)) {
        return null;
    }
    return executor.repoRoot(dir);
}

async function searchReposInFolder(
    folder: string,
    executor: GitExecutor,
    maxDepth: number,
    depth = 0,
): Promise<string[]> {
    const repos: string[] = [];
    const root = await isGitRepo(folder, executor);
    if (root) {
        repos.push(root);
        return repos;
    }
    if (depth >= maxDepth) {
        return repos;
    }

    let entries: fs.Dirent[];
    try {
        entries = fs.readdirSync(folder, { withFileTypes: true });
    } catch {
        return repos;
    }

    for (const entry of entries) {
        if (!entry.isDirectory()) {
            continue;
        }
        if (entry.name === 'node_modules' || entry.name === '.git') {
            continue;
        }
        const subPath = path.join(folder, entry.name);
        const subRepos = await searchReposInFolder(subPath, executor, maxDepth, depth + 1);
        for (const repo of subRepos) {
            if (!repos.includes(repo)) {
                repos.push(repo);
            }
        }
    }
    return repos;
}

function addRepo(found: Map<string, string>, repoPath: string): void {
    const key = normalizeRepoPath(repoPath);
    if (!found.has(key)) {
        found.set(key, repoPath);
    }
}

export class RepoDiscovery {
    private repos: string[] = [];
    private readonly reposChangedListeners: Array<(repos: string[]) => void> = [];

    constructor(private readonly executor: GitExecutor) { }

    bindToContext(context: vscode.ExtensionContext): void {
        context.subscriptions.push(
            vscode.workspace.onDidChangeWorkspaceFolders(() => {
                void this.refreshAndNotify();
            }),
        );
        void this.bindGitApi(context);
    }

    subscribe(listener: (repos: string[]) => void): vscode.Disposable {
        this.reposChangedListeners.push(listener);
        return new vscode.Disposable(() => {
            const index = this.reposChangedListeners.indexOf(listener);
            if (index >= 0) {
                this.reposChangedListeners.splice(index, 1);
            }
        });
    }

    private async bindGitApi(context: vscode.ExtensionContext): Promise<void> {
        const gitApi = await getGitApi();
        if (!gitApi) {
            return;
        }
        context.subscriptions.push(
            gitApi.onDidOpenRepository(() => { void this.refreshAndNotify(); }),
            gitApi.onDidCloseRepository(() => { void this.refreshAndNotify(); }),
        );
    }

    private async refreshAndNotify(): Promise<string[]> {
        const repos = await this.discover();
        for (const listener of this.reposChangedListeners) {
            listener(repos);
        }
        return repos;
    }

    async discover(): Promise<string[]> {
        const found = new Map<string, string>();
        const gitApi = await getGitApi();
        if (gitApi) {
            for (const repository of gitApi.repositories) {
                if (repository.rootUri.scheme === 'file') {
                    addRepo(found, repository.rootUri.fsPath);
                }
            }
        }

        const folders = vscode.workspace.workspaceFolders ?? [];
        for (const folder of folders) {
            const repos = await searchReposInFolder(
                folder.uri.fsPath,
                this.executor,
                DEFAULT_MAX_DEPTH,
            );
            for (const repo of repos) {
                addRepo(found, repo);
            }
        }

        this.repos = [...found.values()].sort();
        return this.repos;
    }

    getRepos(): string[] {
        return [...this.repos];
    }

    getRepoForFile(filePath: string): string | null {
        const normalized = normalizeRepoPath(filePath);
        let best: string | null = null;
        let bestLength = -1;
        for (const repo of this.repos) {
            const repoNorm = normalizeRepoPath(repo);
            if (normalized === repoNorm || normalized.startsWith(`${repoNorm}/`)) {
                if (repoNorm.length > bestLength) {
                    best = repo;
                    bestLength = repoNorm.length;
                }
            }
        }
        return best;
    }

    resolveRepo(repoPath: string): string | null {
        const key = normalizeRepoPath(repoPath);
        for (const repo of this.repos) {
            if (normalizeRepoPath(repo) === key) {
                return repo;
            }
        }
        return this.getRepoForFile(repoPath);
    }

    getInitialRepo(): string | null {
        const activePath = vscode.window.activeTextEditor?.document.uri.fsPath;
        if (activePath) {
            const repo = this.getRepoForFile(activePath);
            if (repo) {
                return repo;
            }
        }
        return this.repos[0] ?? null;
    }
}
