import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { MenuPayloadMeta } from '../contextMenu/buildContextMenu';

export interface ContextMenuItem {
    id: string;
    label: string;
    disabled?: boolean;
    separatorBefore?: boolean;
}

export interface ContextMenuState {
    items: ContextMenuItem[];
    x: number;
    y: number;
    metaById: Record<string, MenuPayloadMeta>;
}

interface ContextMenuProps {
    menu: ContextMenuState | null;
    onClose: () => void;
    onSelect: (id: string) => void;
}

export function ContextMenu({ menu, onClose, onSelect }: ContextMenuProps) {
    const menuRef = useRef<HTMLUListElement>(null);

    useEffect(() => {
        if (!menu) return;
        const onDocMouseDown = (e: MouseEvent) => {
            if (menuRef.current?.contains(e.target as Node)) return;
            onClose();
        };
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('mousedown', onDocMouseDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDocMouseDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [menu, onClose]);

    useEffect(() => {
        if (!menu || !menuRef.current) return;
        const rect = menuRef.current.getBoundingClientRect();
        const maxX = window.innerWidth - rect.width - 4;
        const maxY = window.innerHeight - rect.height - 4;
        menuRef.current.style.left = `${Math.min(menu.x, maxX)}px`;
        menuRef.current.style.top = `${Math.min(menu.y, maxY)}px`;
    }, [menu]);

    if (!menu) return null;

    return createPortal(
        <ul
            ref={menuRef}
            className="git-graph-context-menu"
            style={{ left: menu.x, top: menu.y }}
            role="menu"
            onMouseDown={(e) => e.stopPropagation()}
        >
            {menu.items.map((item) => (
                <li key={item.id} role="none">
                    {item.separatorBefore && <div className="git-graph-context-menu-divider" role="separator" />}
                    <button
                        type="button"
                        role="menuitem"
                        className="git-graph-context-menu-item"
                        disabled={item.disabled}
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelect(item.id);
                            onClose();
                        }}
                    >
                        {item.label}
                    </button>
                </li>
            ))}
        </ul>,
        document.body
    );
}

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
