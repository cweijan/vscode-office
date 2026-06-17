import * as vscode from 'vscode';
import type { GitHistoryPanelContext } from '../provider/gitHistoryPanelContext';
import type { RepoDiscovery } from '../service/repoDiscovery';

function isFileUri(uri: vscode.Uri | undefined): uri is vscode.Uri {
    return uri?.scheme === 'file';
}

export function buildPanelContextFromCommandArg(arg?: unknown): GitHistoryPanelContext {
    if (!arg || typeof arg !== 'object') {
        return {};
    }

    if ('rootUri' in arg) {
        const rootUri = (arg as vscode.SourceControl).rootUri;
        if (isFileUri(rootUri)) {
            return { preferredRepo: rootUri.fsPath };
        }
    }

    if ('resourceUri' in arg) {
        const resourceUri = (arg as vscode.SourceControlResourceState).resourceUri;
        if (isFileUri(resourceUri)) {
            return { fileUri: resourceUri };
        }
    }

    if ('scheme' in arg && (arg as vscode.Uri).scheme === 'file') {
        return { fileUri: arg as vscode.Uri };
    }

    return {};
}

export function resolvePreferredRepo(
    panelContext: GitHistoryPanelContext,
    repoDiscovery: RepoDiscovery,
): string | null {
    if (panelContext.preferredRepo) {
        const matched = repoDiscovery.resolveRepo(panelContext.preferredRepo);
        if (matched) {
            return matched;
        }
    }
    if (panelContext.fileUri) {
        return repoDiscovery.getRepoForFile(panelContext.fileUri.fsPath);
    }
    return null;
}
