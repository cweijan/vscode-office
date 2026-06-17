import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';

export interface DropdownOption {
    value: string;
    label: string;
    hint?: string;
}

interface VscodeDropdownProps {
    label: string;
    options: DropdownOption[];
    value: string | string[] | null;
    multiple?: boolean;
    allLabel?: string;
    filterPlaceholder?: string;
    showAllOption?: boolean;
    onChange: (value: string | string[] | null) => void;
}

function ChevronDown({ open }: { open: boolean }) {
    return (
        <span
            className={`codicon ${open ? 'codicon-chevron-up' : 'codicon-chevron-down'} vscode-dropdown-chevron`}
            aria-hidden
        />
    );
}

export default function VscodeDropdown({
    label,
    options,
    value,
    multiple = false,
    allLabel = 'All',
    filterPlaceholder,
    showAllOption = true,
    onChange,
}: VscodeDropdownProps) {
    const [open, setOpen] = useState(false);
    const [filter, setFilter] = useState('');
    const rootRef = useRef<HTMLDivElement>(null);
    const listId = useId();

    const selectedSet = useMemo(() => {
        if (!multiple) return null;
        if (value === null || !Array.isArray(value) || value.length === 0) return new Set<string>();
        return new Set(value);
    }, [multiple, value]);

    const displayText = useMemo(() => {
        if (multiple) {
            const selected = Array.isArray(value) ? value : [];
            if (selected.length === 0 || selected.length === options.length) return allLabel;
            if (selected.length === 1) {
                return options.find((o) => o.value === selected[0])?.label ?? selected[0];
            }
            return `${selected.length} selected`;
        }
        const v = typeof value === 'string' ? value : '';
        if (!v) return allLabel;
        return options.find((o) => o.value === v)?.label ?? v;
    }, [multiple, value, options, allLabel]);

    const filteredOptions = useMemo(() => {
        const q = filter.trim().toLowerCase();
        if (!q) return options;
        return options.filter((o) =>
            o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)
        );
    }, [options, filter]);

    const close = useCallback(() => {
        setOpen(false);
        setFilter('');
    }, []);

    useEffect(() => {
        if (!open) return;
        const onDocClick = (e: MouseEvent) => {
            if (!rootRef.current?.contains(e.target as Node)) close();
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') close();
        };
        document.addEventListener('mousedown', onDocClick);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDocClick);
            document.removeEventListener('keydown', onKey);
        };
    }, [open, close]);

    const toggleOption = (optionValue: string) => {
        if (!multiple) {
            onChange(optionValue || null);
            close();
            return;
        }
        const current = Array.isArray(value) ? [...value] : [];
        const idx = current.indexOf(optionValue);
        if (idx >= 0) current.splice(idx, 1);
        else current.push(optionValue);
        onChange(current.length > 0 ? current : null);
    };

    const selectAll = () => onChange(null);
    const clearAll = () => onChange(null);

    const isSelected = (optionValue: string) => {
        if (multiple) {
            if (!selectedSet || selectedSet.size === 0) return false;
            return selectedSet.has(optionValue);
        }
        return (typeof value === 'string' ? value : '') === optionValue;
    };

    return (
        <div
            ref={rootRef}
            className={`vscode-dropdown${open ? ' open' : ''}${multiple ? ' multiple' : ''}`}
        >
            <span className="vscode-dropdown-label">{label}</span>
            <div className="vscode-dropdown-control">
                <button
                    type="button"
                    className="vscode-dropdown-trigger"
                    aria-expanded={open}
                    aria-haspopup="listbox"
                    aria-controls={listId}
                    onClick={() => setOpen((v) => !v)}
                >
                    <span className="vscode-dropdown-value" title={displayText}>{displayText}</span>
                    <ChevronDown open={open} />
                </button>
                {open && (
                    <div className="vscode-dropdown-menu" id={listId} role="listbox">
                    {filterPlaceholder && (
                        <div className="vscode-dropdown-filter">
                            <input
                                type="text"
                                className="vscode-dropdown-filter-input"
                                placeholder={filterPlaceholder}
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                autoFocus
                            />
                        </div>
                    )}
                    {multiple && (
                        <div className="vscode-dropdown-actions">
                            <button type="button" className="vscode-dropdown-action" onClick={selectAll}>
                                {allLabel}
                            </button>
                            <button type="button" className="vscode-dropdown-action" onClick={clearAll}>
                                Clear
                            </button>
                        </div>
                    )}
                    <div className="vscode-dropdown-options">
                        {!multiple && showAllOption && (
                            <button
                                type="button"
                                role="option"
                                aria-selected={!value}
                                className={`vscode-dropdown-option${!value ? ' selected' : ''}`}
                                onClick={() => { onChange(null); close(); }}
                            >
                                {allLabel}
                            </button>
                        )}
                        {filteredOptions.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                role="option"
                                aria-selected={isSelected(option.value)}
                                className={`vscode-dropdown-option${isSelected(option.value) ? ' selected' : ''}`}
                                title={option.hint ?? option.label}
                                onClick={() => toggleOption(option.value)}
                            >
                                {multiple && (
                                    <span className="vscode-dropdown-check" aria-hidden>
                                        {isSelected(option.value) ? '✓' : ''}
                                    </span>
                                )}
                                <span className="vscode-dropdown-option-label">{option.label}</span>
                            </button>
                        ))}
                        {filteredOptions.length === 0 && (
                            <div className="vscode-dropdown-empty">No results</div>
                        )}
                    </div>
                    </div>
                )}
            </div>
        </div>
    );
}
