import { useEffect, useState } from 'react';
import { handler } from '../../../util/vscode';
import { isSplitViewLayout } from '../util/splitViewLayout';

export function useSplitViewLayout(initialViewColumn?: number): boolean {
    const [viewColumn, setViewColumn] = useState(initialViewColumn);
    const [splitView, setSplitView] = useState(() =>
        isSplitViewLayout(window.innerHeight, initialViewColumn),
    );

    useEffect(() => {
        handler.on('viewColumn', (content) => {
            const column = (content as { viewColumn?: number })?.viewColumn;
            if (typeof column === 'number') {
                setViewColumn(column);
            }
        });
    }, []);

    useEffect(() => {
        const update = () => {
            setSplitView(isSplitViewLayout(window.innerHeight, viewColumn));
        };
        update();
        window.addEventListener('click', update);
        window.addEventListener('focus', update);
        return () => {
            window.removeEventListener('click', update);
            window.removeEventListener('focus', update);
        };
    }, [viewColumn]);

    return splitView;
}
