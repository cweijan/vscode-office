interface CodiconButtonProps {
    icon: string;
    title?: string;
    className?: string;
    onClick?: () => void;
    disabled?: boolean;
}

function CodiconButton({ icon, title, className, onClick, disabled }: CodiconButtonProps) {
    return (
        <button
            type="button"
            className={`git-graph-icon-btn${className ? ` ${className}` : ''}`}
            title={title}
            aria-label={title}
            onClick={onClick}
            disabled={disabled}
        >
            <span className={`codicon codicon-${icon}`} aria-hidden />
        </button>
    );
}

export function FetchIcon(props: Omit<CodiconButtonProps, 'icon'>) {
    return <CodiconButton icon="repo-fetch" {...props} />;
}

export function PushIcon(props: Omit<CodiconButtonProps, 'icon'>) {
    return <CodiconButton icon="repo-push" {...props} />;
}

export function RefreshIcon(props: Omit<CodiconButtonProps, 'icon'>) {
    return <CodiconButton icon="refresh" {...props} />;
}

export function RemoteIcon(props: Omit<CodiconButtonProps, 'icon'>) {
    return <CodiconButton icon="repo" {...props} />;
}

export function SettingsIcon(props: Omit<CodiconButtonProps, 'icon'>) {
    return <CodiconButton icon="gear" {...props} />;
}

export function FindIcon(props: Omit<CodiconButtonProps, 'icon'>) {
    return <CodiconButton icon="search" {...props} />;
}
