import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { MenuPayloadMeta } from '../contextMenu/buildContextMenu';
import { getContextMenuIcon, getContextMenuIconColor } from '../contextMenu/contextMenuIcons';

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
    onSelect: (id: string, position: { x: number; y: number }) => void;
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
            {menu.items.map((item) => {
                const icon = getContextMenuIcon(item.id);
                const color = getContextMenuIconColor(item.id);
                return (
                <li key={item.id} role="none">
                    {item.separatorBefore && <div className="git-graph-context-menu-divider" role="separator" />}
                    <button
                        type="button"
                        role="menuitem"
                        className={`git-graph-context-menu-item${color ? ` git-graph-context-menu-item--${color}` : ''}`}
                        disabled={item.disabled}
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelect(item.id, { x: e.clientX, y: e.clientY });
                            onClose();
                        }}
                    >
                        <span className="git-graph-context-menu-icon" aria-hidden>
                            {icon ? <span className={`codicon codicon-${icon}`} /> : null}
                        </span>
                        <span className="git-graph-context-menu-label">{item.label}</span>
                    </button>
                </li>
                );
            })}
        </ul>,
        document.body
    );
}
