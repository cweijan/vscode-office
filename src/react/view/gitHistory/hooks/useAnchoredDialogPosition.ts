import { useLayoutEffect, useRef } from 'react';
import {
    computeAnchoredDialogPosition,
    type PopupAnchor,
} from '../util/commitDetailPopup';

export function useAnchoredDialogPosition(
    anchor: PopupAnchor | null | undefined,
    repositionDeps: unknown[] = [],
    centerOffsetY = 0,
) {
    const dialogRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) {
            return;
        }
        if (!anchor) {
            dialog.style.visibility = 'visible';
            dialog.style.left = '50%';
            dialog.style.top = `calc(50% + ${centerOffsetY}px)`;
            dialog.style.transform = 'translate(-50%, -50%)';
            return;
        }
        dialog.style.transform = 'none';
        const { width, height } = dialog.getBoundingClientRect();
        const { left, top } = computeAnchoredDialogPosition(anchor, width, height);
        dialog.style.left = `${left}px`;
        dialog.style.top = `${top}px`;
        dialog.style.visibility = 'visible';
    }, [anchor, centerOffsetY, ...repositionDeps]);

    return dialogRef;
}
