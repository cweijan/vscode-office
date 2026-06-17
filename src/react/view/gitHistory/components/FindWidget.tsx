import { useEffect, useMemo, useRef, useState } from 'react';
import type { GitCommit } from '../types';
import { findCommitMatches } from '../util/findCommits';

interface FindWidgetProps {
    open: boolean;
    commits: GitCommit[];
    currentIndex: number | null;
    onClose: () => void;
    onNavigate: (index: number | null) => void;
}

function buildQueryKey(text: string, caseSensitive: boolean, useRegex: boolean): string {
    return `${text}\0${caseSensitive}\0${useRegex}`;
}

export default function FindWidget({
    open, commits, currentIndex, onClose, onNavigate,
}: FindWidgetProps) {
    const [text, setText] = useState('');
    const [caseSensitive, setCaseSensitive] = useState(false);
    const [useRegex, setUseRegex] = useState(false);
    const [position, setPosition] = useState(-1);
    const [regexError, setRegexError] = useState<string | null>(null);
    const lastAutoQueryKeyRef = useRef('');
    const onNavigateRef = useRef(onNavigate);
    onNavigateRef.current = onNavigate;

    const matches = useMemo(() => {
        const result = findCommitMatches(commits, text, caseSensitive, useRegex);
        if (result.error) {
            return { indices: [] as number[], error: result.error };
        }
        return { indices: result.indices, error: null };
    }, [commits, text, caseSensitive, useRegex]);

    const queryKey = buildQueryKey(text, caseSensitive, useRegex);

    useEffect(() => {
        if (!open) {
            setText('');
            setCaseSensitive(false);
            setUseRegex(false);
            setPosition(-1);
            setRegexError(null);
            lastAutoQueryKeyRef.current = '';
        }
    }, [open]);

    useEffect(() => {
        setRegexError(matches.error);
    }, [matches.error]);

    useEffect(() => {
        if (!open) {
            return;
        }
        if (!text.trim() || matches.indices.length === 0) {
            setPosition(-1);
            if (lastAutoQueryKeyRef.current !== queryKey) {
                lastAutoQueryKeyRef.current = queryKey;
                onNavigateRef.current(null);
            }
            return;
        }
        if (lastAutoQueryKeyRef.current === queryKey) {
            return;
        }
        lastAutoQueryKeyRef.current = queryKey;
        setPosition(0);
        onNavigateRef.current(matches.indices[0]);
    }, [open, queryKey, text, matches.indices]);

    useEffect(() => {
        if (!open || position < 0 || matches.indices.length === 0) {
            return;
        }
        if (currentIndex !== null && matches.indices.includes(currentIndex)) {
            const nextPosition = matches.indices.indexOf(currentIndex);
            if (nextPosition !== position) {
                setPosition(nextPosition);
            }
        }
    }, [open, currentIndex, matches.indices, position]);

    if (!open) return null;

    const go = (direction: 1 | -1) => {
        if (matches.indices.length === 0) return;
        const currentPos = currentIndex !== null && matches.indices.includes(currentIndex)
            ? matches.indices.indexOf(currentIndex)
            : position >= 0 ? position : 0;
        const nextPos = ((currentPos + direction) % matches.indices.length + matches.indices.length) % matches.indices.length;
        setPosition(nextPos);
        onNavigate(matches.indices[nextPos]);
    };

    const activePosition = currentIndex !== null && matches.indices.includes(currentIndex)
        ? matches.indices.indexOf(currentIndex)
        : position;

    const positionLabel = regexError
        ? 'Invalid regex'
        : matches.indices.length > 0 && activePosition >= 0
            ? `${activePosition + 1} of ${matches.indices.length}`
            : text.trim()
                ? 'No Results'
                : '';

    return (
        <div className={`git-graph-find-widget${regexError ? ' error' : ''}`} role="search">
            <div className="git-graph-find-input-group">
                <input
                    type="text"
                    className="vscode-input git-graph-find-input"
                    placeholder="Find"
                    value={text}
                    autoFocus
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            go(e.shiftKey ? -1 : 1);
                        } else if (e.key === 'Escape') {
                            e.preventDefault();
                            onClose();
                        }
                    }}
                />
                <div className="git-graph-find-modifiers">
                    <button
                        type="button"
                        className={`git-graph-find-modifier${caseSensitive ? ' active' : ''}`}
                        title="Match Case"
                        onClick={() => setCaseSensitive((v) => !v)}
                    >
                        Aa
                    </button>
                    <button
                        type="button"
                        className={`git-graph-find-modifier${useRegex ? ' active' : ''}`}
                        title="Use Regular Expression"
                        onClick={() => setUseRegex((v) => !v)}
                    >
                        .*
                    </button>
                </div>
            </div>
            <span className="git-graph-find-position" title={regexError ?? undefined}>{positionLabel}</span>
            <button
                type="button"
                className="git-graph-icon-btn"
                title="Previous match (Shift+Enter)"
                disabled={matches.indices.length === 0}
                onClick={() => go(-1)}
            >
                <span className="codicon codicon-arrow-up" aria-hidden />
            </button>
            <button
                type="button"
                className="git-graph-icon-btn"
                title="Next match (Enter)"
                disabled={matches.indices.length === 0}
                onClick={() => go(1)}
            >
                <span className="codicon codicon-arrow-down" aria-hidden />
            </button>
            <button type="button" className="git-graph-icon-btn" title="Close (Escape)" onClick={onClose}>
                <span className="codicon codicon-close" aria-hidden />
            </button>
        </div>
    );
}
