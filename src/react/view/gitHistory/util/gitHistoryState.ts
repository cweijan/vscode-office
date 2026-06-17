import { vscodeApi } from '../../../util/vscode';

export interface GitPullDefaults {
    noFastForward: boolean;
    squash: boolean;
}

export const DEFAULT_PULL_DEFAULTS: GitPullDefaults = {
    noFastForward: false,
    squash: false,
};

export type FileHistorySplitLayout = 'vertical' | 'horizontal';

export type GitHistoryColorMode = 'adaptive' | 'light';

export const DEFAULT_COLOR_MODE: GitHistoryColorMode = 'adaptive';

export const DEFAULT_FILE_HISTORY_SPLIT_LAYOUT: FileHistorySplitLayout = 'vertical';

export interface GitHistorySavedState {
    repo?: string;
    selectedBranch?: string | null;
    selectedAuthor?: string;
    searchValue?: string;
    selectedCommitHash?: string | null;
    filePath?: string | null;
    pullDefaultsByRepo?: Record<string, GitPullDefaults>;
    fileHistorySplitLayout?: FileHistorySplitLayout;
    colorMode?: GitHistoryColorMode;
}

export function loadGitHistoryState(): GitHistorySavedState {
    return (vscodeApi?.getState?.() as GitHistorySavedState | undefined) ?? {};
}

export function saveGitHistoryState(partial: GitHistorySavedState): void {
    if (!vscodeApi?.setState) return;
    const prev = (vscodeApi.getState?.() ?? {}) as GitHistorySavedState;
    vscodeApi.setState({ ...prev, ...partial });
}

export function getPullDefaults(repo: string): GitPullDefaults {
    const state = loadGitHistoryState();
    return state.pullDefaultsByRepo?.[repo] ?? DEFAULT_PULL_DEFAULTS;
}

export function savePullDefaults(repo: string, defaults: GitPullDefaults): void {
    const state = loadGitHistoryState();
    const pullDefaultsByRepo = { ...(state.pullDefaultsByRepo ?? {}), [repo]: defaults };
    saveGitHistoryState({ pullDefaultsByRepo });
}

export function getFileHistorySplitLayout(): FileHistorySplitLayout {
    const state = loadGitHistoryState();
    return state.fileHistorySplitLayout === 'horizontal' ? 'horizontal' : DEFAULT_FILE_HISTORY_SPLIT_LAYOUT;
}

export function saveFileHistorySplitLayout(layout: FileHistorySplitLayout): void {
    saveGitHistoryState({ fileHistorySplitLayout: layout });
}

export function getColorMode(): GitHistoryColorMode {
    const state = loadGitHistoryState();
    return state.colorMode === 'light' ? 'light' : DEFAULT_COLOR_MODE;
}

export function saveColorMode(mode: GitHistoryColorMode): void {
    saveGitHistoryState({ colorMode: mode });
}
