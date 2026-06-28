import { $t } from '../../../i18n/i18nConfig';

interface SelectionActionBarProps {
    count: number;
    onCopyHashes: () => void;
    onCopyMessages: () => void;
    onCherryPick: () => void;
    onRevert: () => void;
    onClear: () => void;
}

export default function SelectionActionBar({
    count,
    onCopyHashes,
    onCopyMessages,
    onCherryPick,
    onRevert,
    onClear,
}: SelectionActionBarProps) {
    if (count < 2) {
        return null;
    }

    return (
        <div className="git-graph-selection-bar" role="toolbar" aria-label="Batch commit actions">
            <span className="git-graph-selection-bar-count">{count} commits selected</span>
            <div className="git-graph-selection-bar-actions">
                <button type="button" className="git-graph-selection-bar-btn" onClick={onCopyHashes}>
                    <span className="codicon codicon-git-commit" aria-hidden />
                    {$t('git.copyCommitHash')}
                </button>
                <button type="button" className="git-graph-selection-bar-btn" onClick={onCopyMessages}>
                    <span className="codicon codicon-copy" aria-hidden />
                    {$t('git.copyCommitMessage')}
                </button>
                <button type="button" className="git-graph-selection-bar-btn" onClick={onCherryPick}>
                    <span className="codicon codicon-git-compare" aria-hidden />
                    Cherry Pick
                </button>
                <button type="button" className="git-graph-selection-bar-btn git-graph-selection-bar-btn-danger" onClick={onRevert}>
                    <span className="codicon codicon-discard" aria-hidden />
                    Revert
                </button>
                <button type="button" className="git-graph-selection-bar-btn git-graph-selection-bar-btn-ghost" onClick={onClear}>
                    Clear
                </button>
            </div>
        </div>
    );
}
