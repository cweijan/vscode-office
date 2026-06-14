import type { ReactNode, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function IconBase({ size = 16, children, ...props }: IconProps & { children: ReactNode }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
            {children}
        </svg>
    );
}

export function IconFolderOpen(props: IconProps) {
    return (
        <IconBase {...props}>
            <path d="M5 19a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1" />
            <path d="M5 19h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2Z" />
        </IconBase>
    );
}

export function IconReload(props: IconProps) {
    return (
        <IconBase {...props}>
            <path d="M21 12a9 9 0 1 1-3-6.7" />
            <path d="M21 3v6h-6" />
        </IconBase>
    );
}

export function IconFileAdd(props: IconProps) {
    return (
        <IconBase {...props}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
            <path d="M14 2v6h6" />
            <path d="M12 18v-6" />
            <path d="M9 15h6" />
        </IconBase>
    );
}

export function IconExtract(props: IconProps) {
    return (
        <IconBase {...props}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <path d="M7 10l5 5 5-5" />
            <path d="M12 15V3" />
        </IconBase>
    );
}

export function IconFolder(props: IconProps) {
    return (
        <IconBase {...props}>
            <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7l-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z" />
        </IconBase>
    );
}

export function IconFile(props: IconProps) {
    return (
        <IconBase {...props}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
            <path d="M14 2v6h6" />
        </IconBase>
    );
}

export function IconArchive(props: IconProps) {
    return (
        <IconBase {...props}>
            <path d="M21 8v13H3V8" />
            <path d="M1 3h22v5H1z" />
            <path d="M10 12h4" />
        </IconBase>
    );
}

export function IconDelete(props: IconProps) {
    return (
        <IconBase {...props}>
            <path d="M3 6h18" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
        </IconBase>
    );
}

export function IconChevronRight(props: IconProps) {
    return (
        <IconBase {...props}>
            <path d="m9 18 6-6-6-6" />
        </IconBase>
    );
}

export function IconChevronDown(props: IconProps) {
    return (
        <IconBase {...props}>
            <path d="m6 9 6 6 6-6" />
        </IconBase>
    );
}

export function IconSun(props: IconProps) {
    return (
        <IconBase {...props}>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2" />
            <path d="M12 20v2" />
            <path d="m4.93 4.93 1.41 1.41" />
            <path d="m17.66 17.66 1.41 1.41" />
            <path d="M2 12h2" />
            <path d="M20 12h2" />
            <path d="m6.34 17.66-1.41 1.41" />
            <path d="m19.07 4.93-1.41 1.41" />
        </IconBase>
    );
}

export function IconMoon(props: IconProps) {
    return (
        <IconBase {...props}>
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </IconBase>
    );
}

export function IconEye(props: IconProps) {
    return (
        <IconBase {...props}>
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
        </IconBase>
    );
}

export function IconEyeOff(props: IconProps) {
    return (
        <IconBase {...props}>
            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
            <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
            <path d="M2 2l20 20" />
        </IconBase>
    );
}

export function IconSort(props: IconProps) {
    return (
        <IconBase {...props}>
            <path d="m7 15 5 5 5-5" />
            <path d="m7 9 5-5 5 5" />
        </IconBase>
    );
}
