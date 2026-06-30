import type { MouseEvent } from 'react';
import type { GraphLayout } from '../graph/layoutEngine';

interface GitCommitInput {
    hash: string;
    parents: ReadonlyArray<string>;
    stash: unknown | null;
}

interface GraphSvgProps {
    commits: ReadonlyArray<GitCommitInput>;
    selectedIndices: ReadonlySet<number>;
    focusIndex: number | null;
    layout: GraphLayout;
    onSelect: (index: number, event?: MouseEvent) => void;
}

export default function GraphSvg({
    commits, selectedIndices, focusIndex, layout, onSelect,
}: GraphSvgProps) {
    const multiSelect = selectedIndices.size > 1;

    if (commits.length === 0) return null;

    return (
        <svg
            className="git-graph-svg"
            width={layout.width}
            height={layout.height}
            style={{ minWidth: layout.width }}
        >
            {layout.paths.map((path, i) => (
                <path
                    key={`path-${i}`}
                    className="git-graph-line"
                    d={path.d}
                    fill="none"
                    stroke={path.color}
                    strokeWidth={2}
                    strokeDasharray={path.dashed ? '4 2' : undefined}
                />
            ))}
            {layout.vertices.map((v) => {
                const isSelected = selectedIndices.has(v.id);
                const dotClass = [
                    'git-graph-vertex-dot',
                    v.isCurrent ? 'current' : '',
                    isSelected && !multiSelect ? 'active' : '',
                    isSelected && multiSelect ? 'multi-active' : '',
                    isSelected && multiSelect && focusIndex === v.id ? 'selection-focus' : '',
                ].filter(Boolean).join(' ');
                return (
                <g key={v.id} onClick={(e) => onSelect(v.id, e)} className="git-graph-vertex">
                    {v.isStash && !v.isCurrent && (
                        <circle
                            className="git-graph-vertex-stash-ring"
                            cx={v.cx}
                            cy={v.cy}
                            r={5}
                            fill="none"
                            stroke={v.color}
                            strokeWidth={1.5}
                        />
                    )}
                    <circle
                        className={dotClass}
                        cx={v.cx}
                        cy={v.cy}
                        r={v.isCurrent ? 6 : 4}
                        fill={v.isCurrent ? 'var(--git-graph-bg)' : v.color}
                        stroke={v.isCurrent ? v.color : undefined}
                        strokeWidth={v.isCurrent ? 2.5 : 0}
                    />
                </g>
                );
            })}
        </svg>
    );
}
