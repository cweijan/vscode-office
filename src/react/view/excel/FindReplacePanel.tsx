import { useCallback, useEffect, useRef, useState } from 'react';
import type Spreadsheet from './x-spreadsheet/index';
import type { FindMatch, FindOptions } from './x-spreadsheet/index';
import { t } from './excel_i18n';

export interface FindReplacePanelProps {
    spreadSheet: Spreadsheet | null;
    mode: 'find' | 'replace';
    onClose: () => void;
    readOnly?: boolean;
    onChanged?: () => void;
}

export default function FindReplacePanel({
    spreadSheet,
    mode,
    onClose,
    readOnly = false,
    onChanged,
}: FindReplacePanelProps) {
    const [findText, setFindText] = useState('');
    const [replaceText, setReplaceText] = useState('');
    const [matchCase, setMatchCase] = useState(false);
    const [wholeCell, setWholeCell] = useState(false);
    const [allSheets, setAllSheets] = useState(false);
    const [status, setStatus] = useState<{ text: string; error?: boolean } | null>(null);
    const lastMatchRef = useRef<FindMatch | null>(null);
    const findInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        findInputRef.current?.focus();
        findInputRef.current?.select();
    }, [mode]);

    const panelRef = useRef<HTMLDivElement>(null);

    const buildOptions = useCallback((): FindOptions => ({
        matchCase,
        wholeCell,
        allSheets,
    }), [matchCase, wholeCell, allSheets]);

    const gotoMatch = useCallback((match: FindMatch | null) => {
        if (!spreadSheet || !match) {
            setStatus({ text: t('findReplace.notFound'), error: true });
            return;
        }
        spreadSheet.gotoMatch(match);
        lastMatchRef.current = match;
        const col = String.fromCharCode(65 + (match.ci % 26));
        setStatus({
            text: t('findReplace.matchLocation', match.sheetIndex + 1, col, match.ri + 1),
        });
    }, [spreadSheet]);

    const handleFindNext = useCallback((backward = false) => {
        if (!spreadSheet || !findText) return;
        const options = buildOptions();
        const from = lastMatchRef.current ?? spreadSheet.getSelection();
        const current: FindMatch = { sheetIndex: from.sheetIndex, ri: from.ri, ci: from.ci };
        const match = spreadSheet.findNext(findText, current, options, backward)
            ?? spreadSheet.findFirst(findText, options);
        gotoMatch(match);
    }, [spreadSheet, findText, buildOptions, gotoMatch]);

    const handleReplace = useCallback(() => {
        if (!spreadSheet || !findText) return;
        const options = buildOptions();
        let match = lastMatchRef.current;
        if (!match) {
            match = spreadSheet.findFirst(findText, options);
            if (!match) { setStatus({ text: t('findReplace.notFound'), error: true }); return; }
        }
        spreadSheet.replaceAt(match, findText, replaceText, options);
        onChanged?.();
        const next = spreadSheet.findNext(findText, match, options);
        gotoMatch(next ?? spreadSheet.findFirst(findText, options));
    }, [spreadSheet, findText, replaceText, buildOptions, gotoMatch, onChanged]);

    const handleReplaceAll = useCallback(() => {
        if (!spreadSheet || !findText) return;
        const count = spreadSheet.replaceAll(findText, replaceText, buildOptions());
        onChanged?.();
        setStatus({ text: t('findReplace.replacedCount', count) });
        lastMatchRef.current = null;
    }, [spreadSheet, findText, replaceText, buildOptions, onChanged]);

    const showReplace = mode === 'replace' && !readOnly;

    const OptionChip = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
        <button
            type="button"
            className={`frp-chip${checked ? ' frp-chip-active' : ''}`}
            onClick={() => onChange(!checked)}
            title={label}
        >
            {label}
        </button>
    );

    return (
        <div className="frp-panel" ref={panelRef}>
            {/* Header */}
            <div className="frp-header">
                <span className="frp-title">
                    {showReplace ? t('findReplace.titleReplace') : t('findReplace.title')}
                </span>
                <button type="button" className="frp-close" onClick={onClose} aria-label={t('findReplace.close')}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                        <path d="M1 1 L9 9 M9 1 L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                </button>
            </div>

            {/* Find row */}
            <div className="frp-row">
                <div className="frp-input-wrap">
                    <svg className="frp-search-icon" width="13" height="13" viewBox="0 0 16 16" fill="none">
                        <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M10 10 L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    <input
                        ref={findInputRef}
                        className="frp-input"
                        placeholder={t('findReplace.placeholder')}
                        value={findText}
                        onChange={e => { setFindText(e.target.value); setStatus(null); lastMatchRef.current = null; }}
                        onKeyDown={e => {
                            e.nativeEvent.stopPropagation();
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleFindNext(e.shiftKey);
                                findInputRef.current?.focus();
                            }
                            if (e.key === 'Escape') onClose();
                        }}
                    />
                </div>
                <div className="frp-nav-btns">
                    <button type="button" className="frp-nav-btn" title={t('findReplace.previous')} onClick={() => handleFindNext(true)}>
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                            <path d="M2 8 L6 4 L10 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </button>
                    <button type="button" className="frp-nav-btn" title={t('findReplace.next')} onClick={() => handleFindNext(false)}>
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                            <path d="M2 4 L6 8 L10 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </button>
                </div>
            </div>

            {/* Replace row */}
            {showReplace && (
                <div className="frp-row">
                    <div className="frp-input-wrap">
                        <svg className="frp-search-icon" width="13" height="13" viewBox="0 0 16 16" fill="none">
                            <path d="M2 6 Q2 2 6 2 L10 2 Q14 2 14 6 Q14 10 10 10 L7 10 M7 10 L9 8 M7 10 L9 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <input
                            className="frp-input"
                            placeholder={t('findReplace.replacePlaceholder')}
                            value={replaceText}
                            onChange={e => setReplaceText(e.target.value)}
                            onKeyDown={e => { e.nativeEvent.stopPropagation(); if (e.key === 'Enter') handleReplace(); if (e.key === 'Escape') onClose(); }}
                        />
                    </div>
                    <div className="frp-replace-btns">
                        <button type="button" className="frp-action-btn" onClick={() => handleReplace()}>
                            {t('findReplace.replace')}
                        </button>
                        <button type="button" className="frp-action-btn frp-action-btn-primary" onClick={() => handleReplaceAll()}>
                            {t('findReplace.replaceAll')}
                        </button>
                    </div>
                </div>
            )}

            {/* Options */}
            <div className="frp-options">
                <OptionChip checked={matchCase} onChange={setMatchCase} label="Aa" />
                <OptionChip checked={wholeCell} onChange={setWholeCell} label={t('findReplace.wholeCell')} />
                <OptionChip checked={allSheets} onChange={setAllSheets} label={t('findReplace.allSheets')} />
                {status && (
                    <span className={`frp-status${status.error ? ' frp-status-error' : ''}`}>
                        {status.text}
                    </span>
                )}
            </div>
        </div>
    );
}
