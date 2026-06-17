import { useEffect, useState } from 'react';
import { isSplitViewLayout } from '../util/splitViewLayout';

export function useSplitViewLayout(): boolean {
    const [splitView, setSplitView] = useState(() =>
        isSplitViewLayout(window.innerWidth, window.innerHeight),
    );

    useEffect(() => {
        const update = () => {
            setSplitView(isSplitViewLayout(window.innerWidth, window.innerHeight));
        };
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, []);

    return splitView;
}
