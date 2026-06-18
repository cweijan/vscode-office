import * as nodePath from 'path';
import * as vscode from 'vscode';
import { ReactApp } from '../../common/reactApp';
import type { CommitService } from '../service/commitService';
import type { GitActions } from '../service/gitActions';
import type { RepoDiscovery } from '../service/repoDiscovery';
import { getPanelKey, type GitHistoryPanelContext, type GitHistoryPanelSerializedState } from './gitHistoryPanelContext';
import type { GitActionHandler } from './gitActionHandler';
import { MessageRouter } from './messageRouter';
import { PanelHandler } from './panelHandler';
import { buildGitHistoryInitPayload } from '../util/gitHistoryInitPayload';
import { resolvePreferredRepo } from '../util/resolveGitHistoryCommandContext';
import {
    getFileHistorySplitLayout,
    type FileHistorySplitLayout,
} from '../util/gitHistoryPreferences';
import { TelemetryService } from '@/service/telemetryService';

export const GIT_HISTORY_VIEW_TYPE = 'office-git-history';

function isCursorApp(): boolean {
    return /Cursor/i.test(vscode.env.appName);
}

function pathsEqual(a: string, b: string): boolean {
    const left = nodePath.normalize(a);
    const right = nodePath.normalize(b);
    if (left === right) {
        return true;
    }
    return left.toLowerCase() === right.toLowerCase();
}

function isActiveFileHistoryContext(panelContext: GitHistoryPanelContext): boolean {
    if (!panelContext.fileUri) {
        return false;
    }
    const activePath = vscode.window.activeTextEditor?.document.uri.fsPath;
    if (!activePath) {
        return false;
    }
    return pathsEqual(activePath, panelContext.fileUri.fsPath);
}

function resolveViewColumn(panelContext: GitHistoryPanelContext): vscode.ViewColumn {
    const activeEditor = vscode.window.activeTextEditor;
    let column = activeEditor?.viewColumn ?? vscode.ViewColumn.One;
    if (isActiveFileHistoryContext(panelContext)) {
        column = isCursorApp() ? vscode.ViewColumn.Beside : vscode.ViewColumn.Two;
    }
    return column;
}

function getOpenBesideDirection(): 'right' | 'down' {
    return vscode.workspace.getConfiguration('workbench.editor').get<'right' | 'down'>(
        'openSideBySideDirection',
        'right',
    );
}

function needsEditorGroupLayoutToggle(layout: FileHistorySplitLayout): boolean {
    const besideDirection = getOpenBesideDirection();
    if (layout === 'vertical') {
        return besideDirection === 'right';
    }
    return besideDirection === 'down';
}

async function applyFileHistorySplitLayout(
    panelContext: GitHistoryPanelContext,
    layout: FileHistorySplitLayout,
): Promise<void> {
    if (!isActiveFileHistoryContext(panelContext) || !needsEditorGroupLayoutToggle(layout)) {
        return;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    if (vscode.window.tabGroups.all.length >= 2) {
        const orientation = layout === 'vertical' ? 1 : 0;
        await vscode.commands.executeCommand('vscode.setEditorLayout', {
            orientation,
            groups: [{}, {}],
        });
        return;
    }
    await vscode.commands.executeCommand('workbench.action.toggleEditorGroupLayout');
}

export class GitHistoryPanel {
    private static readonly panelMap = new Map<string, GitHistoryPanel>();

    private constructor(
        readonly panel: vscode.WebviewPanel,
        readonly handler: PanelHandler,
        readonly context: GitHistoryPanelContext
    ) { }

    static async createOrShow(
        context: vscode.ExtensionContext,
        commitService: CommitService,
        repoDiscovery: RepoDiscovery,
        gitActions: GitActions,
        gitActionHandler: GitActionHandler,
        panelContext: GitHistoryPanelContext = {}
    ): Promise<void> {
        const key = getPanelKey(panelContext.fileUri);
        const existing = GitHistoryPanel.panelMap.get(key);
        if (existing) {
            await repoDiscovery.discover();
            existing.panel.reveal(existing.panel.viewColumn ?? vscode.ViewColumn.One, true);
            const preferredRepo = resolvePreferredRepo(panelContext, repoDiscovery);
            if (preferredRepo) {
                existing.handler.emit('openRepo', {
                    repo: preferredRepo,
                    repos: repoDiscovery.getRepos(),
                });
            } else {
                existing.handler.emit('repos', {
                    repos: repoDiscovery.getRepos(),
                });
            }
            return;
        }

        const layout = getFileHistorySplitLayout(context);
        const column = resolveViewColumn(panelContext);
        const title = panelContext.fileUri
            ? `Git History (${nodePath.basename(panelContext.fileUri.fsPath)})`
            : 'Git History';
        const id = GIT_HISTORY_VIEW_TYPE + Date.now();
        const panel = vscode.window.createWebviewPanel(
            id,
            title,
            { viewColumn: column, preserveFocus: true },
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: GitHistoryPanel.getLocalResourceRoots(context.extensionPath),
            }
        );

        await applyFileHistorySplitLayout(panelContext, layout);

        await GitHistoryPanel.attach(context, panel, commitService, repoDiscovery, gitActions, gitActionHandler, panelContext);
    }

    private static getLocalResourceRoots(extensionPath: string): vscode.Uri[] {
        return [vscode.Uri.file(extensionPath)];
    }

    static async restore(
        context: vscode.ExtensionContext,
        panel: vscode.WebviewPanel,
        commitService: CommitService,
        repoDiscovery: RepoDiscovery,
        gitActions: GitActions,
        gitActionHandler: GitActionHandler,
        panelContext: GitHistoryPanelContext = {}
    ): Promise<void> {
        const key = getPanelKey(panelContext.fileUri);
        const existing = GitHistoryPanel.panelMap.get(key);
        if (existing && existing.panel !== panel) {
            existing.panel.dispose();
        }
        TelemetryService.get()?.trackGitHistoryView(panelContext.fileUri ? 'file' : 'repo');
        await GitHistoryPanel.attach(context, panel, commitService, repoDiscovery, gitActions, gitActionHandler, panelContext);
    }

    private static applyPanelIcon(panel: vscode.WebviewPanel, extensionPath: string): void {
        panel.iconPath = {
            light: vscode.Uri.file(`${extensionPath}/images/git-history-light.svg`),
            dark: vscode.Uri.file(`${extensionPath}/images/git-history-dark.svg`),
        };
    }

    private static async attach(
        context: vscode.ExtensionContext,
        panel: vscode.WebviewPanel,
        commitService: CommitService,
        repoDiscovery: RepoDiscovery,
        gitActions: GitActions,
        gitActionHandler: GitActionHandler,
        panelContext: GitHistoryPanelContext
    ): Promise<void> {
        GitHistoryPanel.applyPanelIcon(panel, context.extensionPath);

        panel.webview.options = {
            ...panel.webview.options,
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: GitHistoryPanel.getLocalResourceRoots(context.extensionPath),
        };

        const handler = PanelHandler.bind(panel);
        const router = new MessageRouter(
            handler,
            commitService,
            repoDiscovery,
            gitActions,
            panelContext,
            gitActionHandler,
            context,
        );
        router.bind();

        await repoDiscovery.discover();
        const gitHistoryInit = buildGitHistoryInitPayload(
            context,
            repoDiscovery,
            panelContext,
            panel.viewColumn,
        );
        if (gitHistoryInit.initialRepo) {
            router.warmupRepository(
                gitHistoryInit.initialRepo,
                gitHistoryInit.relPath ?? undefined,
            );
        }
        await ReactApp.view(panel.webview, { route: 'gitHistory', gitHistoryInit });

        const key = getPanelKey(panelContext.fileUri);
        const instance = new GitHistoryPanel(panel, handler, panelContext);
        GitHistoryPanel.panelMap.set(key, instance);

        panel.onDidDispose(() => {
            if (GitHistoryPanel.panelMap.get(key) === instance) {
                GitHistoryPanel.panelMap.delete(key);
            }
        });

        panel.onDidChangeViewState(() => {
            handler.emit('viewColumn', { viewColumn: panel.viewColumn ?? vscode.ViewColumn.One });
        });
    }

    static serializeState(context: GitHistoryPanelContext): GitHistoryPanelSerializedState {
        return {
            fileUri: context.fileUri?.toString(),
        };
    }

    static contextFromSerializedState(
        state: (GitHistoryPanelSerializedState & { filePath?: string }) | undefined
    ): GitHistoryPanelContext {
        if (state?.fileUri) {
            return { fileUri: vscode.Uri.parse(state.fileUri) };
        }
        if (state?.filePath) {
            return { fileUri: vscode.Uri.file(state.filePath) };
        }
        return {};
    }
}
