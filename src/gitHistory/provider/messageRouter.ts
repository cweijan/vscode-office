import * as vscode from 'vscode';
import type { PanelHandler } from './panelHandler';
import type { CommitService } from '../service/commitService';
import type { GitActions } from '../service/gitActions';
import type { RepoDiscovery } from '../service/repoDiscovery';
import { getRelativeRepoPath } from '../util/repoPath';
import type { GitHistoryPanelContext } from './gitHistoryPanelContext';
import type { GitActionPayload } from '../types/gitActions';
import type { RemoteActionPayload } from '../types/repoConfig';
import type { LoadCommitsPayload, LoadRepoInfoPayload, CommitDetailsPayload } from '../types/messages';
import { GitActionHandler } from './gitActionHandler';
import {
    getFileHistorySplitLayout,
    setFileHistorySplitLayout,
    type FileHistorySplitLayout,
} from '../util/gitHistoryPreferences';

const DEFAULT_MAX_COMMITS = 300;

export class MessageRouter {
    private loadCommitsId = 0;
    private loadRepoInfoId = 0;

    constructor(
        private readonly handler: PanelHandler,
        private readonly commitService: CommitService,
        private readonly repoDiscovery: RepoDiscovery,
        private readonly gitActions: GitActions,
        private readonly panelContext: GitHistoryPanelContext,
        private readonly gitActionHandler: GitActionHandler,
        private readonly extensionContext: vscode.ExtensionContext,
    ) { }

    bind(): void {
        this.handler
            .on('ready', () => this.onReady())
            .on('loadRepoInfo', (content) => this.onLoadRepoInfo(content as LoadRepoInfoPayload))
            .on('loadCommits', (content) => this.onLoadCommits(content as LoadCommitsPayload))
            .on('commitDetails', (content) => this.onCommitDetails(content as CommitDetailsPayload))
            .on('refresh', () => this.onRefresh())
            .on('fetch', (content) => this.onFetch((content as { repo: string }).repo))
            .on('push', (content) => this.onPush(content as { repo: string; branch: string; remote: string }))
            .on('quickSync', (content) => this.onQuickSync(content as {
                repo: string;
                branch: string;
                remote: string;
                commitMessage: string;
                noFastForward?: boolean;
                squash?: boolean;
            }))
            .on('loadRepoConfig', (content) => this.onLoadRepoConfig((content as { repo: string }).repo))
            .on('remoteAction', (content) => this.onRemoteAction(content as RemoteActionPayload))
            .on('openRemote', (content) => this.onOpenRemote(content as { url: string }))
            .on('gitAction', (content) => this.onGitAction(content as GitActionPayload))
            .on('saveFileHistorySplitLayout', (content) =>
                this.onSaveFileHistorySplitLayout(content as { layout: FileHistorySplitLayout }),
            );
    }

    private resolveInitialRepo(): string | null {
        if (this.panelContext.fileUri) {
            const repo = this.repoDiscovery.getRepoForFile(this.panelContext.fileUri.fsPath);
            if (repo) {
                return repo;
            }
        }
        return this.repoDiscovery.getInitialRepo();
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

    private onReady(): void {
        const initialRepo = this.resolveInitialRepo();
        const filePath = this.panelContext.fileUri?.fsPath ?? null;
        const relPath = initialRepo && filePath
            ? getRelativeRepoPath(initialRepo, filePath)
            : null;
        this.handler.emit('init', {
            repos: this.repoDiscovery.getRepos(),
            initialRepo,
            filePath,
            fileName: filePath ? filePath.split(/[/\\]/).pop() ?? null : null,
            relPath,
            fileHistorySplitLayout: getFileHistorySplitLayout(this.extensionContext),
        });
    }

    private async onSaveFileHistorySplitLayout(payload: { layout: FileHistorySplitLayout }): Promise<void> {
        const layout = payload.layout === 'horizontal' ? 'horizontal' : 'vertical';
        await setFileHistorySplitLayout(this.extensionContext, layout);
    }

    private async onLoadRepoInfo(payload: LoadRepoInfoPayload): Promise<void> {
        if (payload.invalidateCache) {
            this.invalidateRepoCache(payload.repo);
        }
        const refreshId = ++this.loadRepoInfoId;
        const [info, authors, remoteUrls] = await Promise.all([
            this.commitService.getRepoInfo(
                payload.repo,
                payload.showRemoteBranches,
                payload.showStashes
            ),
            this.commitService.getAuthorsCached(payload.repo),
            this.gitActions.getRemoteWebUrls(payload.repo),
        ]);
        if (refreshId !== this.loadRepoInfoId) {
            return;
        }
        this.handler.emit('repoInfo', {
            ...info,
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
        this.handler.emit('refresh', { repos: this.repoDiscovery.getRepos() });
    }

    private invalidateRepoCache(repo: string): void {
        this.commitService.invalidateRepoCache(repo);
    }

    private async onFetch(repo: string): Promise<void> {
        const error = await this.gitActions.fetchFromRemotes(repo);
        if (!error) {
            this.invalidateRepoCache(repo);
        }
        this.handler.emit('fetch', { error });
    }

    private async onPush(payload: { repo: string; branch: string; remote: string }): Promise<void> {
        const error = await this.gitActions.pushCurrentBranch(payload.repo, payload.branch, payload.remote);
        if (error) {
            this.handler.emit('push', { error, cancelled: false });
            return;
        }
        this.invalidateRepoCache(payload.repo);
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
        if (!error) {
            this.invalidateRepoCache(payload.repo);
        }
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
        if (!result.error) {
            this.invalidateRepoCache(payload.repo);
        }
        this.handler.emit('remoteActionResult', {
            error: result.error,
            cancelled: false,
            refresh: result.error === null,
        });
    }

    private async onOpenRemote(payload: { url: string }): Promise<void> {
        const error = await this.gitActions.openRemoteUrl(payload.url);
        if (error) {
            this.handler.emit('error', error);
        }
    }

    private async onGitAction(payload: GitActionPayload): Promise<void> {
        const result = await this.gitActionHandler.handle(payload);
        if (result.error) {
            this.handler.emit('gitActionResult', { error: result.error, refresh: false });
            return;
        }
        if (result.refresh && payload.action !== 'viewScm' && 'repo' in payload) {
            this.invalidateRepoCache(payload.repo);
        }
        this.handler.emit('gitActionResult', result);
    }
}
