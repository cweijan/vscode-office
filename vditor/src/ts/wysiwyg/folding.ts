// Folding is view state only: neither controls nor markers enter the editable DOM.
// This keeps Markdown serialization, copying and the undo history unchanged.
export interface FoldRegion {
    owner: HTMLElement;
    content: HTMLElement[];
}

export const getFoldRegions = (editor: HTMLElement): FoldRegion[] => {
    const regions: FoldRegion[] = [];
    editor.querySelectorAll<HTMLElement>('h1,h2,h3,h4,h5,h6,li').forEach(owner => {
        // Rendered code/HTML previews are not document headings or list items.
        if (owner.closest('[data-type="code-block"], [data-type="html-block"], [contenteditable="false"]')) {
            return;
        }
        const content: HTMLElement[] = [];
        if (owner.tagName === 'LI') {
            Array.from(owner.children).forEach(child => {
                if (child.tagName === 'UL' || child.tagName === 'OL') {
                    content.push(child as HTMLElement);
                }
            });
        } else {
            const level = Number(owner.tagName.substring(1));
            let next = owner.nextElementSibling as HTMLElement;
            while (next) {
                if (/^H[1-6]$/.test(next.tagName) && Number(next.tagName.substring(1)) <= level) {
                    break;
                }
                content.push(next);
                next = next.nextElementSibling as HTMLElement;
            }
        }
        if (content.length) {
            regions.push({owner, content});
        }
    });
    return regions;
};

let foldingId = 0;

export const initFolding = (container: HTMLElement, editor: HTMLElement) => {
    const id = `vditor-folding-${++foldingId}`;
    container.setAttribute('data-folding', id);
    const style = document.createElement('style');
    const controls = document.createElement('div');
    controls.className = 'vditor-folding';
    controls.setAttribute('contenteditable', 'false');
    container.append(style, controls);
    let collapsed = new Set<HTMLElement>();
    let regions: FoldRegion[] = [];
    let regionMap = new Map<HTMLElement, FoldRegion>();
    let frame = 0;
    let disposed = false;
    const buttons = new Map<HTMLElement, HTMLButtonElement>();

    const selector = (element: HTMLElement) => {
        const parts: string[] = [];
        let current: HTMLElement = element;
        while (current !== editor) {
            const parent = current.parentElement;
            if (!parent) {
                return '';
            }
            parts.unshift(`:nth-child(${Array.prototype.indexOf.call(parent.children, current) + 1})`);
            current = parent;
        }
        return `[data-folding="${id}"] > .vditor-reset > ${parts.join(' > ')}`;
    };
    const hiddenByFold = (element: Node | null) => !!element && Array.from(collapsed).some(owner =>
        regionMap.get(owner)?.content.some(node => node === element || node.contains(element)));

    const position = () => {
        const rect = container.getBoundingClientRect();
        const viewport = editor.getBoundingClientRect();
        buttons.forEach((button, owner) => {
            button.hidden = hiddenByFold(owner);
            if (button.hidden) {
                return;
            }
            const box = owner.getBoundingClientRect();
            button.hidden = box.bottom < viewport.top || box.top >= viewport.bottom;
            button.style.top = `${box.top - rect.top + container.scrollTop}px`;
            // Leave list markers and task checkboxes unobstructed.
            button.style.left = `${Math.max(0, box.left - rect.left + container.scrollLeft - (owner.tagName === 'LI' ? 42 : 30))}px`;
        });
    };
    const render = () => {
        const hidden = new Set<HTMLElement>();
        regions.forEach(region => {
            if (collapsed.has(region.owner)) {
                region.content.forEach(node => hidden.add(node));
            }
            const button = buttons.get(region.owner);
            if (button) {
                const expanded = !collapsed.has(region.owner);
                button.textContent = expanded ? '▾' : '▸';
                button.setAttribute('aria-expanded', String(expanded));
                const label = region.owner.tagName === 'LI' ? 'list' : 'section';
                button.setAttribute('aria-label', `${expanded ? 'Collapse' : 'Expand'} ${label}`);
                button.title = button.getAttribute('aria-label') || '';
            }
        });
        const selectors = Array.from(hidden).map(selector).filter(Boolean);
        style.textContent = selectors.length ? `${selectors.join(',\n')} { display: none !important; }` : '';
        position();
    };
    const refresh = () => {
        if (disposed) {
            return;
        }
        regions = getFoldRegions(editor);
        regionMap = new Map(regions.map(region => [region.owner, region]));
        const owners = new Set(regions.map(region => region.owner));
        collapsed = new Set(Array.from(collapsed).filter(owner => owners.has(owner)));
        buttons.forEach((button, owner) => {
            if (!owners.has(owner)) {
                button.remove();
                buttons.delete(owner);
            }
        });
        regions.forEach(region => {
            if (buttons.has(region.owner)) {
                return;
            }
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'vditor-folding__toggle';
            button.addEventListener('mousedown', event => event.preventDefault());
            button.addEventListener('click', event => {
                event.preventDefault();
                event.stopPropagation();
                const currentRegion = regionMap.get(region.owner);
                if (!currentRegion) {
                    return;
                }
                if (collapsed.has(region.owner)) {
                    collapsed.delete(region.owner);
                } else {
                    collapsed.add(region.owner);
                    const selection = window.getSelection();
                    if (selection && (hiddenByFold(selection.anchorNode) || hiddenByFold(selection.focusNode))) {
                        const range = document.createRange();
                        range.selectNodeContents(region.owner);
                        // For a list, stop before the first nested list.
                        if (region.owner.tagName === 'LI') {
                            range.setEndBefore(currentRegion.content[0]);
                        }
                        range.collapse(false);
                        selection.removeAllRanges();
                        selection.addRange(range);
                    }
                }
                render();
            });
            buttons.set(region.owner, button);
            controls.appendChild(button);
        });
        render();
    };
    const schedule = () => {
        if (!frame && !disposed) {
            frame = requestAnimationFrame(() => {
                frame = 0;
                refresh();
            });
        }
    };
    // Structural edits can replace whole subtrees. Expand first so native editing
    // cannot silently merge/delete content that the user currently cannot see.
    const expandForEdit = () => {
        if (collapsed.size) {
            collapsed.clear();
            render();
        }
    };
    const beforeInput = (event: InputEvent) => {
        const selection = window.getSelection();
        if ((event.inputType === 'insertText' || event.inputType === 'insertCompositionText')
            && selection?.isCollapsed && !hiddenByFold(selection.anchorNode)) {
            return;
        }
        expandForEdit();
    };
    const beforeKey = (event: KeyboardEvent) => {
        if (['Enter', 'Tab', 'Backspace', 'Delete'].includes(event.key)) {
            expandForEdit();
        }
    };
    const revealSelection = () => {
        const selection = window.getSelection();
        if (selection && (hiddenByFold(selection.anchorNode) || hiddenByFold(selection.focusNode))) {
            expandForEdit();
        }
    };
    const observer = new MutationObserver(schedule);
    observer.observe(editor, {childList: true, subtree: true, characterData: true});
    const resizeObserver = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(schedule);
    resizeObserver?.observe(editor);
    editor.addEventListener('beforeinput', beforeInput, true);
    editor.addEventListener('keydown', beforeKey, true);
    document.addEventListener('selectionchange', revealSelection);
    editor.addEventListener('cut', expandForEdit, true);
    container.addEventListener('scroll', position, true);
    window.addEventListener('resize', schedule);
    refresh();
    return () => {
        disposed = true;
        observer.disconnect();
        resizeObserver?.disconnect();
        cancelAnimationFrame(frame);
        editor.removeEventListener('beforeinput', beforeInput, true);
        editor.removeEventListener('keydown', beforeKey, true);
        document.removeEventListener('selectionchange', revealSelection);
        editor.removeEventListener('cut', expandForEdit, true);
        container.removeEventListener('scroll', position, true);
        window.removeEventListener('resize', schedule);
        controls.remove();
        style.remove();
        container.removeAttribute('data-folding');
    };
};
