import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import type { GitExecutor } from './gitExecutor';

const DEFAULT_MAX_DEPTH = 2;

async function isGitRepo(dir: string, executor: GitExecutor): Promise<string | null> {
    const gitDir = path.join(dir, '.git');
    if (!fs.existsSync(gitDir)) return null;
    return executor.repoRoot(dir);
}

async function searchReposInFolder(
    folder: string,
    executor: GitExecutor,
    maxDepth: number,
    depth = 0
): Promise<string[]> {
    const repos: string[] = [];
    const root = await isGitRepo(folder, executor);
    if (root) {
        repos.push(root);
        return repos;
    }
    if (depth >= maxDepth) return repos;

    let entries: fs.Dirent[];
    try {
        entries = fs.readdirSync(folder, { withFileTypes: true });
    } catch {
        return repos;
    }

    for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        const subPath = path.join(folder, entry.name);
        const subRepos = await searchReposInFolder(subPath, executor, maxDepth, depth + 1);
        for (const repo of subRepos) {
            if (!repos.includes(repo)) repos.push(repo);
        }
    }
    return repos;
}

export class RepoDiscovery {
    private repos: string[] = [];

    constructor(private readonly executor: GitExecutor) { }

    async discover(): Promise<string[]> {
        const found = new Set<string>();
        const folders = vscode.workspace.workspaceFolders ?? [];

        for (const folder of folders) {
            const repos = await searchReposInFolder(
                folder.uri.fsPath,
                this.executor,
                DEFAULT_MAX_DEPTH
            );
            for (const repo of repos) {
                found.add(repo);
            }
        }

        this.repos = [...found].sort();
        return this.repos;
    }

    getRepos(): string[] {
        return [...this.repos];
    }

    getRepoForFile(filePath: string): string | null {
        const normalized = filePath.replace(/\\/g, '/');
        let best: string | null = null;
        for (const repo of this.repos) {
            const repoNorm = repo.replace(/\\/g, '/');
            if (normalized === repoNorm || normalized.startsWith(repoNorm + '/')) {
                if (!best || repoNorm.length > best.length) best = repo;
            }
        }
        return best;
    }

    getInitialRepo(): string | null {
        const activePath = vscode.window.activeTextEditor?.document.uri.fsPath;
        if (activePath) {
            const repo = this.getRepoForFile(activePath);
            if (repo) return repo;
        }
        return this.repos[0] ?? null;
    }
}
