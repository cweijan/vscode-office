import * as vscode from 'vscode';
import type { PanelHandler } from './panelHandler';
import type { CommitService } from '../service/commitService';
import type { GitActions } from '../service/gitActions';
import { RepoFileWatcher } from '../service/repoFileWatcher';
import type { RepoDiscovery } from '../service/repoDiscovery';
import { getRelativeRepoPath } from '../util/repoPath';
import type { GitHistoryPanelContext } from './gitHistoryPanelContext';
import type { GitActionPayload } from '../types/gitActions';
import type { RemoteActionPayload } from '../types/repoConfig';
import type { LoadCommitsPayload, LoadRepoInfoPayload, CommitDetailsPayload } from '../types/messages';
import type { LoadRepositoryRequest } from '../types/git';
import { buildGitHistoryInitPayload } from '../util/gitHistoryInitPayload';
import { GitActionHandler } from './gitActionHandler';
import {
    setFileHistorySplitLayout,
    type FileHistorySplitLayout,
} from '../util/gitHistoryPreferences';
import { TelemetryService } from '@/service/telemetryService';

const DEFAULT_MAX_COMMITS = 300;

export class MessageRouter {
    private loadCommitsId = 0;
    private loadRepoInfoId = 0;
    private loadRepositoryId = 0;
    private warmupPromise: ReturnType<CommitService['loadRepository']> | null = null;
    private warmupRepo: string | null = null;
    private warmupRelPath: string | undefined;
    private watchedRepo: string | null = null;
    private readonly repoFileWatcher: RepoFileWatcher;
    private disposeReposSubscription: vscode.Disposable | undefined;

    constructor(
        private readonly handler: PanelHandler,
        private readonly commitService: CommitService,
        private readonly repoDiscovery: RepoDiscovery,
        private readonly gitActions: GitActions,
        private readonly panelContext: GitHistoryPanelContext,
        private readonly gitActionHandler: GitActionHandler,
        private readonly extensionContext: vscode.ExtensionContext,
    ) {
        this.repoFileWatcher = new RepoFileWatcher(() => this.onRepoFileChanged());
    }

    bind(): void {
        this.handler.panel.onDidDispose(() => {
            this.repoFileWatcher.stop();
            this.disposeReposSubscription?.dispose();
        });

        this.disposeReposSubscription = this.repoDiscovery.subscribe((repos) => {
            this.handler.emit('repos', { repos });
        });

        this.handler
            .on('ready', () => this.onReady())
            .on('loadRepository', this.wrapHandler((content) =>
                this.onLoadRepository(content as LoadRepositoryRequest)))
            .on('loadRepoInfo', this.wrapHandler((content) =>
                this.onLoadRepoInfo(content as LoadRepoInfoPayload)))
            .on('loadCommits', this.wrapHandler((content) =>
                this.onLoadCommits(content as LoadCommitsPayload)))
            .on('commitDetails', this.wrapHandler((content) =>
                this.onCommitDetails(content as CommitDetailsPayload)))
            .on('refresh', this.wrapHandler(() => this.onRefresh()))
            .on('fetch', this.wrapHandler((content) =>
                this.onFetch((content as { repo: string }).repo)))
            .on('pull', this.wrapHandler((content) =>
                this.onPull(content as {
                    repo: string;
                    branch: string;
                    remote: string;
                    noFastForward?: boolean;
                    squash?: boolean;
                })))
            .on('push', this.wrapHandler((content) =>
                this.onPush(content as { repo: string; branch: string; remote: string; remotes?: string[]; force?: boolean })))
            .on('quickSync', this.wrapHandler((content) =>
                this.onQuickSync(content as {
                    repo: string;
                    branch: string;
                    remote: string;
                    commitMessage: string;
                    noFastForward?: boolean;
                    squash?: boolean;
                })))
            .on('loadRepoConfig', this.wrapHandler((content) =>
                this.onLoadRepoConfig((content as { repo: string }).repo)))
            .on('remoteAction', this.wrapHandler((content) =>
                this.onRemoteAction(content as RemoteActionPayload)))
            .on('openRemote', this.wrapHandler((content) =>
                this.onOpenRemote(content as { url: string })))
            .on('queryRemoteWebUrls', this.wrapHandler((content) =>
                this.onQueryRemoteWebUrls((content as { repo: string }).repo)))
            .on('gitAction', this.wrapHandler((content) =>
                this.onGitAction(content as GitActionPayload)))
            .on('saveFileHistorySplitLayout', this.wrapHandler((content) =>
                this.onSaveFileHistorySplitLayout(content as { layout: FileHistorySplitLayout })))
            .on('trackEvent', this.wrapHandler((content) => {
                const payload = content as { event: string; properties?: Record<string, string> };
                TelemetryService.get()?.trackEvent(payload.event, payload.properties);
            }))
            .on('sponsorClick', this.wrapHandler((content) => {
                const payload = content as { action: 'logo' | 'site'; component?: string; placement?: string; variant?: string };
                TelemetryService.get()?.trackPreviewSponsorClick(payload.action, payload);
            }))
            .on('openSponsor', this.wrapHandler(() => {
                void vscode.commands.executeCommand(
                    'workbench.extensions.action.showExtensionsWithIds',
                    ['cweijan.vscode-database-client2'],
                );
            }))
            .on('openExternal', this.wrapHandler((content) => {
                const url = typeof content === 'string' ? content : '';
                if (url) {
                    void vscode.env.openExternal(vscode.Uri.parse(url));
                }
            }))
            .on('editorLayoutSingle', this.wrapHandler(() => {
                this.handler.panel.reveal(
                    this.handler.panel.viewColumn ?? vscode.ViewColumn.Active,
                    false,
                );
                void vscode.commands.executeCommand('workbench.action.editorLayoutSingle');
            }));
    }

    private wrapHandler<T>(fn: (content: T) => void | Promise<void>): (content: T) => Promise<void> {
        return async (content) => {
            this.repoFileWatcher.mute();
            try {
                await fn(content);
            } finally {
                this.repoFileWatcher.unmute();
            }
        };
    }

    private onRepoFileChanged(): void {
        if (!this.handler.panel.visible) {
            return;
        }
        this.handler.emit('refresh', { repos: this.repoDiscovery.getRepos() });
    }

    private startWatchingRepo(repo: string): void {
        if (repo === this.watchedRepo) {
            return;
        }
        this.watchedRepo = repo;
        this.repoFileWatcher.start(repo);
    }

    private resolveInitialRepo(): string | null {
        return buildGitHistoryInitPayload(
            this.extensionContext,
            this.repoDiscovery,
            this.panelContext,
        ).initialRepo;
    }

    private resolveRelPath(repo: string, relPath?: string): string | undefined {
        if (relPath) {
            return relPath;
        }
        if (!this.panelContext.fileUri) {
            return undefined;
        }
        return getRelativeRepoPath(repo, this.panelContext.fileUri.fsPath) ?? undefined;
    }

    private async onReady(): Promise<void> {
        await this.repoDiscovery.discover();
        this.handler.emit('repos', { repos: this.repoDiscovery.getRepos() });
    }

    warmupRepository(repo: string, relPath?: string): void {
        this.warmupRepo = repo;
        this.warmupRelPath = relPath;
        this.warmupPromise = this.commitService.loadRepository(
            this.buildDefaultLoadRequest(repo, relPath),
        );
    }

    private buildDefaultLoadRequest(repo: string, relPath?: string): LoadRepositoryRequest {
        return {
            repo,
            showRemoteBranches: true,
            showStashes: true,
            branches: null,
            maxCommits: DEFAULT_MAX_COMMITS,
            showTags: true,
            includeCommitsMentionedByReflogs: false,
            onlyFollowFirstParent: false,
            commitOrdering: 'date',
            hideRemotes: [],
            relPath,
        };
    }

    private canReuseWarmup(payload: LoadRepositoryRequest, relPath?: string): boolean {
        if (!this.warmupPromise || this.warmupRepo !== payload.repo) {
            return false;
        }
        if (payload.branches !== null && payload.branches.length > 0) {
            return false;
        }
        if (payload.author || payload.searchValue) {
            return false;
        }
        const payloadRelPath = relPath ?? payload.relPath;
        return payloadRelPath === this.warmupRelPath;
    }

    private async onLoadRepository(payload: LoadRepositoryRequest): Promise<void> {
        const refreshId = ++this.loadRepositoryId;
        const relPath = this.resolveRelPath(payload.repo, payload.relPath);
        const request = { ...payload, relPath };

        let resultPromise: ReturnType<CommitService['loadRepository']>;
        if (this.canReuseWarmup(payload, relPath)) {
            resultPromise = this.warmupPromise!;
        } else {
            resultPromise = this.commitService.loadRepository(request);
        }
        this.warmupPromise = null;
        this.warmupRepo = null;
        this.warmupRelPath = undefined;

        const result = await resultPromise;
        if (refreshId !== this.loadRepositoryId) {
            return;
        }
        this.handler.emit('repositoryLoaded', {
            repoInfo: result.repoInfo,
            commitData: result.commitData,
            relPath: relPath ?? null,
        });
        if (!result.repoInfo.error) {
            this.startWatchingRepo(payload.repo);
            void this.loadRepoExtras(payload.repo, refreshId, result.repoInfo.remotes, 'repository');
        }
    }

    private async onSaveFileHistorySplitLayout(payload: { layout: FileHistorySplitLayout }): Promise<void> {
        const layout = payload.layout === 'horizontal' ? 'horizontal' : 'vertical';
        await setFileHistorySplitLayout(this.extensionContext, layout);
    }

    private async onLoadRepoInfo(payload: LoadRepoInfoPayload): Promise<void> {
        const refreshId = ++this.loadRepoInfoId;
        const info = await this.commitService.getRepoInfo(
            payload.repo,
            payload.showRemoteBranches,
            payload.showStashes,
        );
        if (refreshId !== this.loadRepoInfoId) {
            return;
        }
        this.handler.emit('repoInfo', info);
        void this.loadRepoExtras(payload.repo, refreshId, info.remotes, 'repoInfo');
    }

    private async loadRepoExtras(
        repo: string,
        refreshId: number,
        remotes: ReadonlyArray<string>,
        refreshKind: 'repoInfo' | 'repository' = 'repoInfo',
    ): Promise<void> {
        const [authors, remoteUrls] = await Promise.all([
            this.commitService.getAuthors(repo),
            this.gitActions.getRemoteWebUrls(repo, remotes),
        ]);
        const stale = refreshKind === 'repository'
            ? refreshId !== this.loadRepositoryId
            : refreshId !== this.loadRepoInfoId;
        if (stale) {
            return;
        }
        this.handler.emit('repoExtras', {
            authors,
            hasRemoteUrl: remoteUrls.length > 0,
            remoteWebUrls: remoteUrls,
        });
    }

    private async onLoadCommits(payload: LoadCommitsPayload): Promise<void> {
        const refreshId = ++this.loadCommitsId;
        const relPath = this.resolveRelPath(payload.repo, payload.relPath);
        const data = await this.commitService.getCommits({
            repo: payload.repo,
            branches: payload.branches,
            maxCommits: payload.maxCommits || DEFAULT_MAX_COMMITS,
            showTags: payload.showTags,
            showRemoteBranches: payload.showRemoteBranches,
            includeCommitsMentionedByReflogs: payload.includeCommitsMentionedByReflogs,
            onlyFollowFirstParent: payload.onlyFollowFirstParent,
            commitOrdering: payload.commitOrdering,
            remotes: payload.remotes,
            hideRemotes: payload.hideRemotes,
            stashes: payload.stashes,
            author: payload.author,
            searchValue: payload.searchValue,
            relPath,
        });
        if (refreshId === this.loadCommitsId) {
            this.handler.emit('commits', { ...data, relPath: relPath ?? null });
        }
    }

    private async onCommitDetails(payload: CommitDetailsPayload): Promise<void> {
        const data = await this.commitService.getCommitDetails(
            payload.repo,
            payload.commitHash,
            payload.hasParents
        );
        this.handler.emit('commitDetails', data);
    }

    private async onRefresh(): Promise<void> {
        await this.repoDiscovery.discover();
        this.handler.emit('repos', { repos: this.repoDiscovery.getRepos() });
        this.handler.emit('refresh', { repos: this.repoDiscovery.getRepos() });
    }

    private async onFetch(repo: string): Promise<void> {
        TelemetryService.get()?.trackEvent('gitHistory.toolbar.fetch');
        const error = await this.gitActions.fetchFromRemotes(repo);
        this.handler.emit('fetch', { error });
    }

    private async onPull(payload: {
        repo: string;
        branch: string;
        remote: string;
        noFastForward?: boolean;
        squash?: boolean;
    }): Promise<void> {
        TelemetryService.get()?.trackEvent('gitHistory.toolbar.pull');
        const error = await this.gitActions.pullCurrentBranch(
            payload.repo,
            payload.branch,
            payload.remote,
            {
                noFastForward: payload.noFastForward,
                squash: payload.squash,
            },
        );
        this.handler.emit('pull', { error });
    }

    private async onPush(payload: { repo: string; branch: string; remote: string; remotes?: string[]; force?: boolean }): Promise<void> {
        TelemetryService.get()?.trackEvent('gitHistory.toolbar.push', { force: String(!!payload.force) });
        const targets = payload.remotes?.length ? payload.remotes : (payload.remote ? [payload.remote] : []);
        for (const remote of targets) {
            const error = await this.gitActions.pushCurrentBranch(
                payload.repo,
                payload.branch,
                remote,
                payload.force,
            );
            if (error) {
                this.handler.emit('push', { error, cancelled: false });
                return;
            }
        }
        this.handler.emit('push', { error: null, cancelled: false });
    }

    private async onQuickSync(payload: {
        repo: string;
        branch: string;
        remote: string;
        commitMessage: string;
        noFastForward?: boolean;
        squash?: boolean;
    }): Promise<void> {
        const error = await this.gitActions.quickSync(
            payload.repo,
            payload.branch,
            payload.remote,
            payload.commitMessage,
            {
                noFastForward: payload.noFastForward,
                squash: payload.squash,
            },
        );
        this.handler.emit('quickSync', { error });
    }

    private async onLoadRepoConfig(repo: string): Promise<void> {
        const remotes = await this.gitActions.getRepoRemotes(repo);
        this.handler.emit('repoConfig', { remotes });
    }

    private async onRemoteAction(payload: RemoteActionPayload): Promise<void> {
        const result = await this.gitActions.manageRemote(payload);
        if (result.cancelled) {
            this.handler.emit('remoteActionResult', { error: null, cancelled: true, refresh: false });
            return;
        }
        this.handler.emit('remoteActionResult', {
            error: result.error,
            cancelled: false,
            refresh: result.error === null,
        });
    }

    private async onOpenRemote(payload: { url: string }): Promise<void> {
        TelemetryService.get()?.trackEvent('gitHistory.toolbar.openRemote');
        const error = await this.gitActions.openRemoteUrl(payload.url);
        if (error) {
            this.handler.emit('error', error);
        }
    }

    private async onQueryRemoteWebUrls(repo: string): Promise<void> {
        const remoteWebUrls = await this.gitActions.getRemoteWebUrls(repo);
        this.handler.emit('remoteWebUrls', { repo, remoteWebUrls });
    }

    private async onGitAction(payload: GitActionPayload): Promise<void> {
        const result = await this.gitActionHandler.handle(payload);
        if (result.error) {
            this.handler.emit('gitActionResult', { error: result.error, refresh: false });
            return;
        }
        this.handler.emit('gitActionResult', result);
    }
}
