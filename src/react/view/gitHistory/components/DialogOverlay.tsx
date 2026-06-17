import { useEffect, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { themeStyle, useGitHistoryTheme } from '../theme/gitHistoryTheme';

interface DialogOverlayProps {
    children: ReactNode;
    onCancel: () => void;
    anchored?: boolean;
}

export default function DialogOverlay({ children, onCancel, anchored = false }: DialogOverlayProps) {
    const { cssVars } = useGitHistoryTheme();

    useEffect(() => {
        document.body.classList.add('git-graph-dialog-open');
        return () => document.body.classList.remove('git-graph-dialog-open');
    }, []);

    const handleOverlayMouseDown = (event: MouseEvent<HTMLDivElement>) => {
        if (event.target === event.currentTarget) {
            onCancel();
        }
    };

    return createPortal(
        <div className="git-graph" style={themeStyle(cssVars)}>
            <div
                className={`git-graph-dialog-overlay${anchored ? ' anchored' : ''}`}
                onMouseDown={handleOverlayMouseDown}
            >
                {children}
            </div>
        </div>,
        document.body,
    );
}
