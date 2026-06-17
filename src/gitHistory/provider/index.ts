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

async function openGitHistory(
    context: vscode.ExtensionContext,
    panelContext: GitHistoryPanelContext = {}
): Promise<void> {
    if (!commitService || !repoDiscovery || !gitActions || !gitRepoCommands || !gitActionHandler) {
        return;
    }
    await repoDiscovery.discover();
    if (panelContext.fileUri) {
        const repo = repoDiscovery.getRepoForFile(panelContext.fileUri.fsPath);
        if (!repo) {
            vscode.window.showErrorMessage('The file is not within a Git repository in the current workspace.');
            return;
        }
    }
    await GitHistoryPanel.createOrShow(
        context,
        commitService,
        repoDiscovery,
        gitActions,
        gitActionHandler,
        panelContext
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

    context.subscriptions.push(
        vscode.commands.registerCommand('office.gitHistory.view', async () => {
            await openGitHistory(context);
        }),
        vscode.commands.registerCommand('office.gitHistory.viewFileHistory', async (arg?: vscode.Uri | { resourceUri?: vscode.Uri }) => {
            const fileUri = resolveFileUri(arg);
            if (!fileUri) {
                vscode.window.showWarningMessage('Open a file to view its Git history.');
                return;
            }
            await openGitHistory(context, { fileUri });
        }),
        vscode.commands.registerCommand('office.gitHistory.find', () => {
            GitHistoryPanel.emitToActivePanel('toggleFind');
        }),
        vscode.window.registerWebviewPanelSerializer(
            GIT_HISTORY_VIEW_TYPE,
            new GitHistoryPanelSerializer(context, commitService, repoDiscovery, gitActions, gitActionHandler)
        )
    );
}
