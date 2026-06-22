import * as vscode from 'vscode';
import { CommitService } from '../service/commitService';
import { GitActions } from '../service/gitActions';
import { findGit, UNABLE_TO_FIND_GIT_MSG } from '../service/findGit';
import { GitExecutor } from '../service/gitExecutor';
import { GitRepoCommands } from '../service/gitRepoCommands';
import { RepoDiscovery } from '../service/repoDiscovery';
import { GitActionHandler } from './gitActionHandler';
import { GitHistoryPanel, GIT_HISTORY_VIEW_TYPE } from './gitHistoryPanel';
import type { GitHistoryPanelContext } from './gitHistoryPanelContext';
import { GitHistoryPanelSerializer } from './gitHistoryPanelSerializer';
import {
    buildPanelContextFromCommandArg,
    resolvePreferredRepo,
} from '../util/resolveGitHistoryCommandContext';
import { TelemetryService } from '@/service/telemetryService';

let commitService: CommitService | undefined;
let repoDiscovery: RepoDiscovery | undefined;
let gitActions: GitActions | undefined;
let gitRepoCommands: GitRepoCommands | undefined;
let gitActionHandler: GitActionHandler | undefined;

function resolveFileUri(arg?: vscode.Uri | { resourceUri?: vscode.Uri }): vscode.Uri | undefined {
    if (arg && typeof arg === 'object' && 'resourceUri' in arg && arg.resourceUri?.scheme === 'file') {
        return arg.resourceUri;
    }
    if (arg && typeof arg === 'object' && 'scheme' in arg && arg.scheme === 'file') {
        return arg as vscode.Uri;
    }
    const active = vscode.window.activeTextEditor?.document.uri;
    if (active?.scheme === 'file') {
        return active;
    }
    return undefined;
}

function mergePanelContext(
    base: GitHistoryPanelContext,
    fromArg: GitHistoryPanelContext,
): GitHistoryPanelContext {
    return {
        fileUri: base.fileUri ?? fromArg.fileUri,
        preferredRepo: base.preferredRepo ?? fromArg.preferredRepo,
    };
}

async function openGitHistory(
    context: vscode.ExtensionContext,
    panelContext: GitHistoryPanelContext = {},
): Promise<void> {
    if (!commitService || !repoDiscovery || !gitActions || !gitRepoCommands || !gitActionHandler) {
        return;
    }
    await repoDiscovery.discover();
    const preferredRepo = resolvePreferredRepo(panelContext, repoDiscovery);
    if (panelContext.fileUri && !preferredRepo) {
        vscode.window.showErrorMessage('The file is not within a Git repository in the current workspace.');
        return;
    }
    if (preferredRepo) {
        panelContext = { ...panelContext, preferredRepo };
    }
    TelemetryService.get()?.trackGitHistoryView(panelContext.fileUri ? 'file' : 'repo');
    await GitHistoryPanel.createOrShow(
        context,
        commitService,
        repoDiscovery,
        gitActions,
        gitActionHandler,
        panelContext,
    );
}

export async function activateGitHistory(context: vscode.ExtensionContext): Promise<void> {
    try {
        const gitExecutable = await findGit();
        const executor = new GitExecutor(gitExecutable);
        commitService = new CommitService(executor);
        repoDiscovery = new RepoDiscovery(executor);
        gitActions = new GitActions(executor);
        gitRepoCommands = new GitRepoCommands(executor);
        gitActionHandler = new GitActionHandler(gitRepoCommands);
        repoDiscovery.bindToContext(context);
        await repoDiscovery.discover();
    } catch {
        context.subscriptions.push(
            vscode.commands.registerCommand('office.gitHistory.view', () => {
                vscode.window.showErrorMessage(UNABLE_TO_FIND_GIT_MSG);
            }),
            vscode.commands.registerCommand('office.gitHistory.viewFileHistory', () => {
                vscode.window.showErrorMessage(UNABLE_TO_FIND_GIT_MSG);
            })
        );
        return;
    }

    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 50);
    statusBarItem.command = 'office.gitHistory.view';
    statusBarItem.text = '$(git-commit) Git';
    statusBarItem.tooltip = 'Open Git History';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    context.subscriptions.push(
        vscode.commands.registerCommand('office.gitHistory.view', async (arg?: unknown) => {
            const panelContext = buildPanelContextFromCommandArg(arg);
            await openGitHistory(context, panelContext);
        }),
        vscode.commands.registerCommand('office.gitHistory.viewFileHistory', async (arg?: unknown) => {
            const fromArg = buildPanelContextFromCommandArg(arg);
            const fileUri = resolveFileUri(arg) ?? fromArg.fileUri;
            if (!fileUri) {
                vscode.window.showWarningMessage('Open a file to view its Git history.');
                return;
            }
            await openGitHistory(context, mergePanelContext({ fileUri }, fromArg));
        }),
        vscode.window.registerWebviewPanelSerializer(
            GIT_HISTORY_VIEW_TYPE,
            new GitHistoryPanelSerializer(context, commitService, repoDiscovery, gitActions, gitActionHandler)
        )
    );
}
