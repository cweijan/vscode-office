import { useEffect, useState } from 'react';
import type { GitPullDefaults, FileHistorySplitLayout } from '../util/gitHistoryState';
import type { GitRemoteDetail } from '../types';

interface SettingsWidgetProps {
    open: boolean;
    repo: string;
    remotes: GitRemoteDetail[];
    loading: boolean;
    pullDefaults: GitPullDefaults;
    fileHistorySplitLayout: FileHistorySplitLayout;
    onClose: () => void;
    onPullDefaultsChange: (defaults: GitPullDefaults) => void;
    onFileHistorySplitLayoutChange: (layout: FileHistorySplitLayout) => void;
    onAddRemote: () => void;
    onEditRemote: (name: string) => void;
    onDeleteRemote: (name: string) => void;
}

export default function SettingsWidget({
    open, repo, remotes, loading, pullDefaults, fileHistorySplitLayout, onClose,
    onPullDefaultsChange, onFileHistorySplitLayoutChange, onAddRemote, onEditRemote, onDeleteRemote,
}: SettingsWidgetProps) {
    const [localPull, setLocalPull] = useState(pullDefaults);
    const [localSplitLayout, setLocalSplitLayout] = useState(fileHistorySplitLayout);

    useEffect(() => {
        if (open) {
            setLocalPull(pullDefaults);
            setLocalSplitLayout(fileHistorySplitLayout);
        }
    }, [open, pullDefaults, fileHistorySplitLayout]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open) return null;

    const repoLabel = repo.split(/[/\\]/).pop() ?? repo;

    return (
        <aside className="git-graph-settings-panel" aria-label="Settings">
            <div className="git-graph-settings-body">
                <section className="git-graph-settings-group">
                    <div className="git-graph-settings-group-header">
                        <h2>Extension Settings</h2>
                        <button type="button" className="git-graph-icon-btn" title="Close" onClick={onClose}>
                            <span className="codicon codicon-close" aria-hidden />
                        </button>
                    </div>
                    <div className="git-graph-settings-group-content">
                        <div className="git-graph-settings-section">
                            <h3>File History Split</h3>
                            <p className="git-graph-settings-hint">
                                Editor layout when opening file Git history beside the current file.
                            </p>
                            <label className="git-graph-settings-radio">
                                <input
                                    type="radio"
                                    name="file-history-split"
                                    checked={localSplitLayout === 'vertical'}
                                    onChange={() => {
                                        setLocalSplitLayout('vertical');
                                        onFileHistorySplitLayoutChange('vertical');
                                    }}
                                />
                                <span>Vertical (stacked)</span>
                            </label>
                            <label className="git-graph-settings-radio">
                                <input
                                    type="radio"
                                    name="file-history-split"
                                    checked={localSplitLayout === 'horizontal'}
                                    onChange={() => {
                                        setLocalSplitLayout('horizontal');
                                        onFileHistorySplitLayoutChange('horizontal');
                                    }}
                                />
                                <span>Horizontal (side by side)</span>
                            </label>
                        </div>
                    </div>
                </section>

                <section className="git-graph-settings-group">
                    <div className="git-graph-settings-group-header">
                        <h2>Repository Settings</h2>
                    </div>
                    <div className="git-graph-settings-group-content">
                        <div className="git-graph-settings-section">
                            <h3>Remote Configuration</h3>
                            {loading ? (
                                <p className="git-graph-muted">Loading remotes...</p>
                            ) : remotes.length === 0 ? (
                                <p className="git-graph-muted">No remotes configured for this repository.</p>
                            ) : (
                                <table className="git-graph-settings-table">
                                    <thead>
                                        <tr>
                                            <th>Remote</th>
                                            <th>URL</th>
                                            <th>Type</th>
                                            <th />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {remotes.flatMap((remote) => [
                                            <tr key={`${remote.name}-fetch`}>
                                                <td rowSpan={2}>{remote.name}</td>
                                                <td className="git-graph-settings-url" title={remote.url ?? ''}>
                                                    {remote.url ?? 'Not Set'}
                                                </td>
                                                <td>Fetch</td>
                                                <td rowSpan={2} className="git-graph-settings-actions">
                                                    <button
                                                        type="button"
                                                        className="git-graph-icon-btn"
                                                        title="Edit remote"
                                                        onClick={() => onEditRemote(remote.name)}
                                                    >
                                                        <span className="codicon codicon-edit" aria-hidden />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="git-graph-icon-btn"
                                                        title="Delete remote"
                                                        onClick={() => onDeleteRemote(remote.name)}
                                                    >
                                                        <span className="codicon codicon-trash" aria-hidden />
                                                    </button>
                                                </td>
                                            </tr>,
                                            <tr key={`${remote.name}-push`}>
                                                <td className="git-graph-settings-url" title={remote.pushUrl ?? remote.url ?? ''}>
                                                    {remote.pushUrl ?? remote.url ?? 'Not Set'}
                                                </td>
                                                <td>Push</td>
                                            </tr>,
                                        ])}
                                    </tbody>
                                </table>
                            )}
                            <div className="git-graph-settings-section-actions">
                                <button type="button" className="git-graph-settings-btn" onClick={onAddRemote}>
                                    <span className="codicon codicon-add" aria-hidden />
                                    Add Remote
                                </button>
                            </div>
                        </div>

                        <div className="git-graph-settings-section">
                            <h3>Default Pull Behaviour</h3>
                            <p className="git-graph-settings-hint">
                                Applied when pulling from the context menu for <strong>{repoLabel}</strong>.
                            </p>
                            <label className="git-graph-settings-checkbox">
                                <input
                                    type="checkbox"
                                    checked={localPull.noFastForward}
                                    onChange={(e) => {
                                        const next = { ...localPull, noFastForward: e.target.checked };
                                        setLocalPull(next);
                                        onPullDefaultsChange(next);
                                    }}
                                />
                                <span>No Fast Forward (--no-ff)</span>
                            </label>
                            <label className="git-graph-settings-checkbox">
                                <input
                                    type="checkbox"
                                    checked={localPull.squash}
                                    onChange={(e) => {
                                        const next = { ...localPull, squash: e.target.checked };
                                        setLocalPull(next);
                                        onPullDefaultsChange(next);
                                    }}
                                />
                                <span>Squash (--squash)</span>
                            </label>
                        </div>
                    </div>
                </section>
            </div>
        </aside>
    );
}
