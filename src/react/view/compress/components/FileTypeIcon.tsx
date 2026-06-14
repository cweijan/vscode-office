import { useMemo, useState } from 'react';
import { IconFile, IconFolder } from '../icons';
import { getFileIconUrl } from '../fileIcon';

export function FileTypeIcon({ name, isDirectory }: { name?: string; isDirectory?: boolean }) {
    const [failed, setFailed] = useState(false);
    const iconUrl = useMemo(() => (name && !isDirectory ? getFileIconUrl(name) : null), [name, isDirectory]);

    if (isDirectory) {
        return <IconFolder size={15} />;
    }
    if (!iconUrl || failed) {
        return <IconFile size={15} />;
    }
    return (
        <img
            className="zip-type-icon"
            src={iconUrl}
            alt=""
            draggable={false}
            onError={() => setFailed(true)}
        />
    );
}
