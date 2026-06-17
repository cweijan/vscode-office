import { MoonOutlined, SunOutlined } from '@ant-design/icons';

interface CodiconButtonProps {
    icon: string;
    title?: string;
    className?: string;
    variant?: 'fetch' | 'push' | 'remote' | 'sync';
    onClick?: () => void;
    disabled?: boolean;
}

function CodiconButton({ icon, title, className, variant, onClick, disabled }: CodiconButtonProps) {
    const variantClass = variant ? ` git-graph-toolbar-btn-${variant}` : '';
    return (
        <button
            type="button"
            className={`git-graph-icon-btn${variantClass}${className ? ` ${className}` : ''}`}
            title={title}
            aria-label={title}
            onClick={onClick}
            disabled={disabled}
        >
            <span className={`codicon codicon-${icon}`} aria-hidden />
        </button>
    );
}

export function FetchIcon(props: Omit<CodiconButtonProps, 'icon' | 'variant'>) {
    return <CodiconButton icon="repo-fetch" variant="fetch" {...props} />;
}

export function PushIcon(props: Omit<CodiconButtonProps, 'icon' | 'variant'>) {
    return <CodiconButton icon="repo-push" variant="push" {...props} />;
}

export function QuickSyncIcon(props: Omit<CodiconButtonProps, 'icon' | 'variant'>) {
    return <CodiconButton icon="repo-sync" variant="sync" {...props} />;
}

export function RefreshIcon(props: Omit<CodiconButtonProps, 'icon' | 'variant'>) {
    return <CodiconButton icon="refresh" {...props} />;
}

export function RemoteIcon(props: Omit<CodiconButtonProps, 'icon' | 'variant'>) {
    return <CodiconButton icon="repo" variant="remote" {...props} />;
}

export function SettingsIcon(props: Omit<CodiconButtonProps, 'icon' | 'variant'>) {
    return <CodiconButton icon="gear" {...props} />;
}

export function FindIcon(props: Omit<CodiconButtonProps, 'icon' | 'variant'>) {
    return <CodiconButton icon="search" {...props} />;
}

export function ThemeToggleIcon({
    adaptive,
    onClick,
}: {
    adaptive: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            className="git-graph-icon-btn git-graph-theme-toggle"
            title={adaptive ? '切换亮色' : '切换暗色（跟随 VS Code 主题）'}
            aria-label={adaptive ? 'Switch to light mode' : 'Switch to adaptive dark mode'}
            onClick={onClick}
        >
            {adaptive ? <SunOutlined /> : <MoonOutlined />}
        </button>
    );
}
