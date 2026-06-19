import type { ReactNode } from 'react';
import type { PopupAnchor } from '../util/commitDetailPopup';
import { useAnchoredDialogPosition } from '../hooks/useAnchoredDialogPosition';

interface AnchoredDialogProps {
    anchor?: PopupAnchor | null;
    ariaLabel: string;
    repositionDeps?: unknown[];
    centerOffsetY?: number;
    compact?: boolean;
    children: ReactNode;
}

export function AnchoredDialog({
    anchor,
    ariaLabel,
    repositionDeps = [],
    centerOffsetY = 0,
    compact = false,
    children,
}: AnchoredDialogProps) {
    const dialogRef = useAnchoredDialogPosition(anchor, repositionDeps, centerOffsetY);

    return (
        <div
            ref={dialogRef}
            className={`git-graph-anchored-dialog${compact ? ' compact' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            onMouseDown={(e) => e.stopPropagation()}
        >
            <div className="git-graph-anchored-dialog-content">
                {children}
            </div>
        </div>
    );
}

interface AnchoredDialogActionsProps {
    primaryLabel: string;
    onPrimary: () => void;
    primaryDisabled?: boolean;
    onCancel: () => void;
    cancelLabel?: string;
}

export function AnchoredDialogActions({
    primaryLabel,
    onPrimary,
    primaryDisabled = false,
    onCancel,
    cancelLabel = 'Cancel',
}: AnchoredDialogActionsProps) {
    return (
        <div className="git-graph-anchored-dialog-actions">
            <button
                type="button"
                className="git-graph-anchored-dialog-btn primary"
                disabled={primaryDisabled}
                onClick={onPrimary}
            >
                {primaryLabel}
            </button>
            <button
                type="button"
                className="git-graph-anchored-dialog-btn"
                onClick={onCancel}
            >
                {cancelLabel}
            </button>
        </div>
    );
}
