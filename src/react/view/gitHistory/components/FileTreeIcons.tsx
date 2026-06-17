// Folder icons from vscode-git-graph (icons8 iOS11 pack, CC BY-ND 3.0)
interface FolderTreeIconProps {
    isOpen: boolean;
    className?: string;
}

const OPEN_FOLDER_PATH =
    'M 5 4 C 3.895 4 3 4.895 3 6 L 3 9 L 3 11 L 22 11 L 27 11 L 27 8 C 27 6.895 26.105 6 25 6 L 12.199219 6 L 11.582031 4.9707031 C 11.221031 4.3687031 10.570187 4 9.8671875 4 L 5 4 z M 2.5019531 13 C 1.4929531 13 0.77040625 13.977406 1.0664062 14.941406 L 4.0351562 24.587891 C 4.2941563 25.426891 5.0692656 26 5.9472656 26 L 15 26 L 24.052734 26 C 24.930734 26 25.705844 25.426891 25.964844 24.587891 L 28.933594 14.941406 C 29.229594 13.977406 28.507047 13 27.498047 13 L 15 13 L 2.5019531 13 z';

const CLOSED_FOLDER_PATH =
    'M 4 3 C 2.895 3 2 3.895 2 5 L 2 8 L 13 8 L 28 8 L 28 7 C 28 5.895 27.105 5 26 5 L 11.199219 5 L 10.582031 3.9707031 C 10.221031 3.3687031 9.5701875 3 8.8671875 3 L 4 3 z M 3 10 C 2.448 10 2 10.448 2 11 L 2 23 C 2 24.105 2.895 25 4 25 L 26 25 C 27.105 25 28 24.105 28 23 L 28 11 C 28 10.448 27.552 10 27 10 L 3 10 z';

export function FolderTreeIcon({ isOpen, className }: FolderTreeIconProps) {
    const iconClass = [
        'git-graph-cdv-folder-tree-icon',
        isOpen ? 'open' : 'closed',
        className,
    ].filter(Boolean).join(' ');

    return (
        <span className="git-graph-cdv-folder-icon" aria-hidden>
            <svg
                className={iconClass}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 30 30"
            >
                <path d={isOpen ? OPEN_FOLDER_PATH : CLOSED_FOLDER_PATH} />
            </svg>
        </span>
    );
}
