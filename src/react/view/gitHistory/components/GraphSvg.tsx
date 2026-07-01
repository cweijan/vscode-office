import type { MouseEvent } from 'react';
import type { GraphLayout } from '../graph/layoutEngine';

interface GraphSvgProps {
    layout: GraphLayout;
    selectedIndices: ReadonlySet<number>;
    focusIndex: number | null;
    onSelect: (index: number, event?: MouseEvent) => void;
}

export default function GraphSvg({
    layout, selectedIndices, focusIndex, onSelect,
}: GraphSvgProps) {
    const multiSelect = selectedIndices.size > 1;

    if (layout.vertices.length === 0 && layout.paths.length === 0) {
        return null;
    }

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
                    className={`git-graph-line${path.dimmed ? ' git-graph-line-dimmed' : ''}`}
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
                    v.onCurrentBranch ? '' : 'dimmed',
                    isSelected && !multiSelect ? 'active' : '',
                    isSelected && multiSelect ? 'multi-active' : '',
                    isSelected && multiSelect && focusIndex === v.id ? 'selection-focus' : '',
                ].filter(Boolean).join(' ');
                return (
                <g key={v.id} onClick={(e) => onSelect(v.id, e)} className="git-graph-vertex">
                    {v.isStash && !v.isCurrent && (
                        <circle
                            className={`git-graph-vertex-stash-ring${v.onCurrentBranch ? '' : ' dimmed'}`}
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
