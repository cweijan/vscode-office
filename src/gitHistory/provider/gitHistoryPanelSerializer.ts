import * as vscode from 'vscode';
import type { CommitService } from '../service/commitService';
import type { GitActions } from '../service/gitActions';
import type { RepoDiscovery } from '../service/repoDiscovery';
import type { GitActionHandler } from './gitActionHandler';
import { GitHistoryPanel } from './gitHistoryPanel';
import type { GitHistoryPanelSerializedState } from './gitHistoryPanelContext';

export class GitHistoryPanelSerializer implements vscode.WebviewPanelSerializer<GitHistoryPanelSerializedState> {
    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly commitService: CommitService,
        private readonly repoDiscovery: RepoDiscovery,
        private readonly gitActions: GitActions,
        private readonly gitActionHandler: GitActionHandler
    ) { }

    async deserializeWebviewPanel(
        webviewPanel: vscode.WebviewPanel,
        state: (GitHistoryPanelSerializedState & { filePath?: string }) | undefined
    ): Promise<void> {
        const panelContext = GitHistoryPanel.contextFromSerializedState(state);
        await GitHistoryPanel.restore(
            this.context,
            webviewPanel,
            this.commitService,
            this.repoDiscovery,
            this.gitActions,
            this.gitActionHandler,
            panelContext
        );
    }
}
