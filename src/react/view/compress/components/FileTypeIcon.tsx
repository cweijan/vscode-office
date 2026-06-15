import { useMemo, useState } from 'react';
import { IconFile, IconFolder } from '../icons';
import { getFileIconUrl, getFolderIconUrl } from '../fileIcon';

export function FileTypeIcon({ name, isDirectory }: { name?: string; isDirectory?: boolean }) {
    const [failed, setFailed] = useState(false);
    const iconUrl = useMemo(() => {
        if (!name) return null;
        return isDirectory ? getFolderIconUrl(name) : getFileIconUrl(name);
    }, [name, isDirectory]);

    if (!iconUrl || failed) {
        return isDirectory ? <IconFolder size={15} /> : <IconFile size={15} />;
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
