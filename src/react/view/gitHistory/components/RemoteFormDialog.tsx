import { useEffect, useState } from 'react';
import type { GitRemoteDetail } from '../types';
import DialogOverlay from './DialogOverlay';

interface RemoteFormDialogProps {
    mode: 'add' | 'edit';
    remote?: GitRemoteDetail;
    onCancel: () => void;
    onSubmit: (data: { name: string; url: string; pushUrl: string }) => void;
}

export default function RemoteFormDialog({ mode, remote, onCancel, onSubmit }: RemoteFormDialogProps) {
    const [name, setName] = useState(remote?.name ?? '');
    const [url, setUrl] = useState(remote?.url ?? '');
    const [pushUrl, setPushUrl] = useState(remote?.pushUrl ?? '');

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onCancel();
            }
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onCancel]);

    const title = mode === 'add' ? 'Add Remote' : 'Edit Remote';
    const canSubmit = name.trim().length > 0 && url.trim().length > 0;

    return (
        <DialogOverlay onCancel={onCancel}>
            <div
                className="git-graph-dialog"
                role="dialog"
                aria-modal="true"
                aria-label={title}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="git-graph-dialog-header">
                    <h2>{title}</h2>
                    <button type="button" className="git-graph-icon-btn" title="Cancel" onClick={onCancel}>
                        <span className="codicon codicon-close" aria-hidden />
                    </button>
                </div>
                <div className="git-graph-dialog-body">
                    <label className="git-graph-dialog-field">
                        <span className="git-graph-dialog-label">Remote name</span>
                        <input
                            type="text"
                            className="vscode-input"
                            placeholder="origin"
                            value={name}
                            autoFocus
                            onChange={(e) => setName(e.target.value)}
                        />
                    </label>
                    <label className="git-graph-dialog-field">
                        <span className="git-graph-dialog-label">Fetch URL</span>
                        <input
                            type="text"
                            className="vscode-input"
                            placeholder="https://github.com/user/repo.git"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                        />
                    </label>
                    <label className="git-graph-dialog-field">
                        <span className="git-graph-dialog-label">Push URL (optional)</span>
                        <input
                            type="text"
                            className="vscode-input"
                            placeholder="Leave blank to use the Fetch URL"
                            value={pushUrl}
                            onChange={(e) => setPushUrl(e.target.value)}
                        />
                    </label>
                </div>
                <div className="git-graph-dialog-footer">
                    <button type="button" className="git-graph-dialog-btn" onClick={onCancel}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="git-graph-dialog-btn primary"
                        disabled={!canSubmit}
                        onClick={() => onSubmit({ name: name.trim(), url: url.trim(), pushUrl: pushUrl.trim() })}
                    >
                        {mode === 'add' ? 'Add' : 'Save'}
                    </button>
                </div>
            </div>
        </DialogOverlay>
    );
}
