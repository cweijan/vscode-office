import type { MouseEvent } from 'react';
import { MoonOutlined, SunOutlined } from '@ant-design/icons';
import ToolbarTooltip from './ToolbarTooltip';

interface CodiconButtonProps {
    icon: string;
    title?: string;
    className?: string;
    variant?: 'fetch' | 'pull' | 'push' | 'remote' | 'sync';
    onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
    disabled?: boolean;
}

function CodiconButton({ icon, title, className, variant, onClick, disabled }: CodiconButtonProps) {
    const variantClass = variant ? ` git-graph-toolbar-btn-${variant}` : '';
    return (
        <ToolbarTooltip content={title}>
            <button
                type="button"
                className={`git-graph-icon-btn${variantClass}${className ? ` ${className}` : ''}`}
                onClick={onClick}
                disabled={disabled}
            >
                <span className={`codicon codicon-${icon}`} aria-hidden />
            </button>
        </ToolbarTooltip>
    );
}

export function FetchIcon(props: Omit<CodiconButtonProps, 'icon' | 'variant'>) {
    return <CodiconButton icon="git-fetch" variant="fetch" {...props} />;
}

export function PullIcon(props: Omit<CodiconButtonProps, 'icon' | 'variant'>) {
    return <CodiconButton icon="repo-pull" variant="pull" {...props} />;
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

export function ExpandLayoutIcon(props: Omit<CodiconButtonProps, 'icon' | 'variant'>) {
    return <CodiconButton icon="expand-all" {...props} />;
}

export function ThemeToggleIcon({
    adaptive,
    onClick,
}: {
    adaptive: boolean;
    onClick: () => void;
}) {
    const label = adaptive ? '切换亮色' : '切换暗色（跟随 VS Code 主题）';
    return (
        <ToolbarTooltip content={label}>
            <button
                type="button"
                className="git-graph-icon-btn git-graph-theme-toggle"
                onClick={onClick}
            >
                {adaptive ? <SunOutlined /> : <MoonOutlined />}
            </button>
        </ToolbarTooltip>
    );
}
