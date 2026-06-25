import { type MouseEvent, useEffect, useState } from 'react';
import { handler } from '../../util/vscode';
import { getConfigs } from '../../util/vscodeConfig';
import './Sponsor.less';

const SPONSOR_URL = 'https://database-client.com/';

interface SponsorProps {
    dark?: boolean;
    variant?: 'sidebar' | 'fixed';
}

function useSponsorDark(dark?: boolean): boolean {
    const [resolved, setResolved] = useState(
        () => dark ?? document.body.classList.contains('office-dark'),
    );

    useEffect(() => {
        if (dark !== undefined) {
            setResolved(dark);
            return;
        }
        const sync = () => setResolved(document.body.classList.contains('office-dark'));
        sync();
        const observer = new MutationObserver(sync);
        observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, [dark]);

    return resolved;
}

export default function Sponsor({ dark, variant = 'fixed' }: SponsorProps) {
    const resolvedDark = useSponsorDark(dark);
    const baseUrl = getConfigs()?.sponsorBaseUrl;
    if (!baseUrl) return null;

    const logoSrc = `${baseUrl}/${resolvedDark ? 'logo.png' : 'logo_dark.png'}`;

    const openWebsite = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        handler.emit('sponsorClick', { action: 'site', component: 'sidebar', variant });
        handler.emit('openExternal', SPONSOR_URL);
    };

    return (
        <div className={`office-sponsor office-sponsor--${variant}`}>
            <button
                type="button"
                className="office-sponsor-logo-btn"
                title="Database Client — open extension"
                aria-label="Database Client extension"
                onClick={() => {
                    handler.emit('sponsorClick', { action: 'logo', component: 'sidebar', variant });
                    handler.emit('openSponsor');
                }}
            >
                <img className="office-sponsor-logo" src={logoSrc} alt="Database Client" draggable={false} />
            </button>
            <p className="office-sponsor-text">
                Supported by{' '}
                <a
                    className="office-sponsor-link"
                    href={SPONSOR_URL}
                    onClick={openWebsite}
                >
                    Database Client
                </a>
            </p>
        </div>
    );
}
