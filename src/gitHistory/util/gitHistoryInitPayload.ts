import type * as vscode from 'vscode';
import type { RepoDiscovery } from '../service/repoDiscovery';
import type { GitHistoryPanelContext } from '../provider/gitHistoryPanelContext';
import { getRelativeRepoPath } from './repoPath';
import {
    getFileHistorySplitLayout,
    type FileHistorySplitLayout,
} from './gitHistoryPreferences';

export interface GitHistoryEmbeddedInit {
    repos: string[];
    initialRepo: string | null;
    filePath: string | null;
    fileName: string | null;
    relPath: string | null;
    fileHistorySplitLayout: FileHistorySplitLayout;
    viewColumn?: number;
}

function resolveInitialRepo(
    repoDiscovery: RepoDiscovery,
    panelContext: GitHistoryPanelContext,
): string | null {
    if (panelContext.fileUri) {
        const repo = repoDiscovery.getRepoForFile(panelContext.fileUri.fsPath);
        if (repo) {
            return repo;
        }
    }
    return repoDiscovery.getInitialRepo();
}

export function buildGitHistoryInitPayload(
    extensionContext: vscode.ExtensionContext,
    repoDiscovery: RepoDiscovery,
    panelContext: GitHistoryPanelContext,
    viewColumn?: number,
): GitHistoryEmbeddedInit {
    const initialRepo = resolveInitialRepo(repoDiscovery, panelContext);
    const filePath = panelContext.fileUri?.fsPath ?? null;
    const relPath = initialRepo && filePath
        ? getRelativeRepoPath(initialRepo, filePath)
        : null;
    return {
        repos: repoDiscovery.getRepos(),
        initialRepo,
        filePath,
        fileName: filePath ? filePath.split(/[/\\]/).pop() ?? null : null,
        relPath,
        fileHistorySplitLayout: getFileHistorySplitLayout(extensionContext),
        viewColumn,
    };
}
