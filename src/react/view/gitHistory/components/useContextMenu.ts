import { useCallback, useState } from 'react';
import type { MenuPayloadMeta } from '../contextMenu/buildContextMenu';
import type { ContextMenuItem, ContextMenuState } from './ContextMenu';

export function useContextMenu() {
    const [menu, setMenu] = useState<ContextMenuState | null>(null);

    const showMenu = useCallback((
        items: ContextMenuItem[],
        metaById: Record<string, MenuPayloadMeta>,
        x: number,
        y: number,
    ) => {
        if (items.length === 0) return;
        setMenu({ items, metaById, x, y });
    }, []);

    const closeMenu = useCallback(() => setMenu(null), []);

    return { menu, showMenu, closeMenu };
}
