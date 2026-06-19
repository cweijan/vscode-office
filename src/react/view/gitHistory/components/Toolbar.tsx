import type { MouseEvent } from 'react';
import VscodeDropdown from './VscodeDropdown';
import { FetchIcon, PushIcon, RefreshIcon, RemoteIcon, FindIcon, SettingsIcon, ThemeToggleIcon, ExpandLayoutIcon } from './ToolbarIcons';

interface ToolbarProps {
    repos: string[];
    repo: string;
    branches: string[];
    selectedBranch: string | null;
    authors: string[];
    selectedAuthor: string | undefined;
    searchValue: string;
    refreshing: boolean;
    fetching: boolean;
    pushing: boolean;
    syncing: boolean;
    canPush: boolean;
    hasRemoteUrl: boolean;
    findActive: boolean;
    settingsActive: boolean;
    splitView: boolean;
    adaptiveColorMode: boolean;
    onRepoChange: (repo: string) => void;
    onBranchChange: (branch: string | null) => void;
    onAuthorChange: (author: string | undefined) => void;
    onSearchChange: (value: string) => void;
    onSearch: () => void;
    onFetch: () => void;
    onPush: (event: MouseEvent<HTMLButtonElement>) => void;
    onOpenRemote: (event: MouseEvent<HTMLButtonElement>) => void;
    onToggleFind: () => void;
    onRefresh: () => void;
    onToggleSettings: () => void;
    onExpandLayout: () => void;
    onToggleColorMode: () => void;
}

function repoLabel(path: string): string {
    const parts = path.replace(/\\/g, '/').split('/');
    return parts[parts.length - 1] || path;
}

export default function Toolbar({
    repos, repo, branches, selectedBranch, authors, selectedAuthor,
    searchValue, refreshing, fetching, pushing, syncing, canPush, hasRemoteUrl,
    findActive, settingsActive, splitView, adaptiveColorMode,
    onRepoChange, onBranchChange, onAuthorChange,
    onSearchChange, onSearch,
    onFetch, onPush, onOpenRemote, onToggleFind, onRefresh, onToggleSettings, onExpandLayout, onToggleColorMode,
}: ToolbarProps) {
    const showRepo = repos.length > 1;
    const remoteOpClass = fetching
        ? ' git-graph-toolbar--fetching'
        : pushing
            ? ' git-graph-toolbar--pushing'
            : '';

    return (
        <div className={`git-graph-toolbar${showRepo ? '' : ' single-repo'}${remoteOpClass}`}>
            <div className="git-graph-toolbar-search">
                <input
                    type="text"
                    className="vscode-input"
                    placeholder="Enter to search commit"
                    value={searchValue}
                    onChange={(e) => onSearchChange(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') onSearch(); }}
                />
            </div>

            <div className="git-graph-toolbar-filters">
                {showRepo && (
                    <VscodeDropdown
                        label="Repo:"
                        options={repos.map((r) => ({ value: r, label: repoLabel(r), hint: r }))}
                        value={repo}
                        filterPlaceholder="Filter repositories..."
                        showAllOption={false}
                        onChange={(v) => { if (typeof v === 'string' && v) onRepoChange(v); }}
                    />
                )}
                <VscodeDropdown
                    label="Branch:"
                    options={branches.map((b) => ({ value: b, label: b }))}
                    value={selectedBranch ?? ''}
                    allLabel="All"
                    filterPlaceholder="Filter branches..."
                    onChange={(v) => onBranchChange(typeof v === 'string' && v ? v : null)}
                />
                <VscodeDropdown
                    label="Author:"
                    options={authors.map((a) => ({ value: a, label: a }))}
                    value={selectedAuthor ?? ''}
                    allLabel="All"
                    filterPlaceholder="Filter authors..."
                    onChange={(v) => onAuthorChange(typeof v === 'string' && v ? v : undefined)}
                />
            </div>

            <div className="git-graph-toolbar-actions">
                <RefreshIcon
                    title="Refresh"
                    onClick={onRefresh}
                    disabled={refreshing}
                    className={refreshing ? ' spinning' : ''}
                />
                <FetchIcon
                    title="Fetch from remote(s)"
                    onClick={onFetch}
                    disabled={fetching || pushing || syncing || !repo}
                    className={fetching ? 'running' : undefined}
                />
                <PushIcon
                    title="Push current branch to remote"
                    onClick={onPush}
                    disabled={pushing || syncing || fetching || !canPush}
                    className={pushing ? 'running' : undefined}
                />
                <RemoteIcon
                    title={hasRemoteUrl ? 'Open remote repository' : 'No remote URL configured'}
                    onClick={onOpenRemote}
                    disabled={!repo || !hasRemoteUrl}
                />
            </div>

            <div className="git-graph-toolbar-tools">
                {splitView && (
                    <ExpandLayoutIcon
                        title="Expand to single editor layout"
                        onClick={onExpandLayout}
                    />
                )}
                <ThemeToggleIcon adaptive={adaptiveColorMode} onClick={onToggleColorMode} />
                <FindIcon
                    title="Find in commit history (Ctrl+F)"
                    onClick={onToggleFind}
                    className={findActive ? 'active' : undefined}
                    disabled={!repo}
                />
                <SettingsIcon
                    title="Repository settings"
                    onClick={onToggleSettings}
                    className={settingsActive ? 'active' : undefined}
                    disabled={!repo}
                />
            </div>
        </div>
    );
}
