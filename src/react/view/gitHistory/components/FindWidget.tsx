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
    const onNavigateRef = useRef(onNavigate);

    useEffect(() => {
        onNavigateRef.current = onNavigate;
    }, [onNavigate]);

    const matches = useMemo(() => {
        const result = findCommitMatches(commits, text, caseSensitive, useRegex);
        if (result.error) {
            return { indices: [] as number[], error: result.error };
        }
        return { indices: result.indices, error: null };
    }, [commits, text, caseSensitive, useRegex]);

    const regexError = matches.error;

    if (!open) return null;

    const updateSearch = (nextText: string, nextCaseSensitive: boolean, nextUseRegex: boolean) => {
        const result = findCommitMatches(commits, nextText, nextCaseSensitive, nextUseRegex);
        if (!nextText.trim() || result.error || result.indices.length === 0) {
            onNavigateRef.current(null);
            return;
        }
        onNavigateRef.current(result.indices[0]);
    };

    const go = (direction: 1 | -1) => {
        if (matches.indices.length === 0) return;
        const currentPos = currentIndex !== null && matches.indices.includes(currentIndex)
            ? matches.indices.indexOf(currentIndex)
            : 0;
        const nextPos = ((currentPos + direction) % matches.indices.length + matches.indices.length) % matches.indices.length;
        onNavigate(matches.indices[nextPos]);
    };

    const activePosition = currentIndex !== null && matches.indices.includes(currentIndex)
        ? matches.indices.indexOf(currentIndex)
        : matches.indices.length > 0 ? 0 : -1;

    const noResults = !regexError && text.trim() !== '' && matches.indices.length === 0;
    const positionLabel = regexError
        ? 'Invalid regex'
        : matches.indices.length > 0 && activePosition >= 0
            ? `${activePosition + 1} of ${matches.indices.length}`
            : 'No Results';

    return (
        <div className={`git-graph-find-widget${regexError ? ' error' : ''}`} role="search">
            <div className="git-graph-find-input-group">
                <input
                    type="text"
                    className="vscode-input git-graph-find-input"
                    placeholder="Find"
                    value={text}
                    autoFocus
                    onChange={(e) => {
                        const nextText = e.target.value;
                        setText(nextText);
                        updateSearch(nextText, caseSensitive, useRegex);
                    }}
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
                        onClick={() => {
                            const next = !caseSensitive;
                            setCaseSensitive(next);
                            updateSearch(text, next, useRegex);
                        }}
                    >
                        Aa
                    </button>
                    <button
                        type="button"
                        className={`git-graph-find-modifier${useRegex ? ' active' : ''}`}
                        title="Use Regular Expression"
                        onClick={() => {
                            const next = !useRegex;
                            setUseRegex(next);
                            updateSearch(text, caseSensitive, next);
                        }}
                    >
                        .*
                    </button>
                </div>
            </div>
            <span className={`git-graph-find-position${noResults ? ' no-results' : ''}`} title={regexError ?? undefined}>{positionLabel}</span>
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
