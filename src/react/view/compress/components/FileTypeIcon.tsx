import { useMemo, useState } from 'react';
import { IconFile, IconFolder, IconFolderOpen } from '../icons';
import { getFileIconUrl, getFolderIconUrl } from '../fileIcon';

export function FileTypeIcon({ name, isDirectory, expanded }: { name?: string; isDirectory?: boolean; expanded?: boolean }) {
    const [failed, setFailed] = useState(false);
    const iconUrl = useMemo(() => {
        if (!name) return null;
        return isDirectory ? getFolderIconUrl(name, expanded) : getFileIconUrl(name);
    }, [name, isDirectory, expanded]);

    if (!iconUrl || failed) {
        return isDirectory
            ? (expanded ? <IconFolderOpen size={15} /> : <IconFolder size={15} />)
            : <IconFile size={15} />;
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
