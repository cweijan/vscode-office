import { type MouseEvent } from 'react';
import { handler } from '../../util/vscode';
import { getConfigs } from '../../util/vscodeConfig';
import './SponsorBar.less';

const SPONSOR_URL = 'https://database-client.com/';

interface SponsorBarProps {
    placement: 'center' | 'right' | 'left';
}

export default function SponsorBar({ placement }: SponsorBarProps) {
    const baseUrl = getConfigs()?.sponsorBaseUrl;
    if (!baseUrl) return null;

    const iconSrc = `${baseUrl}/icon.png`;

    const openWebsite = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        handler.emit('sponsorClick', { action: 'site', component: 'bar', placement });
        handler.emit('openExternal', SPONSOR_URL);
    };

    return (
        <div className={`office-sponsor-bar office-sponsor-bar--${placement}`}>
            <button
                type="button"
                className="office-sponsor-bar-logo-btn"
                title="Database Client — open extension"
                aria-label="Database Client extension"
                onClick={() => {
                    handler.emit('sponsorClick', { action: 'logo', component: 'bar', placement });
                    handler.emit('openSponsor');
                }}
            >
                <img className="office-sponsor-bar-logo" src={iconSrc} alt="Database Client" draggable={false} />
            </button>
            <p className="office-sponsor-bar-text">
                Supported by{' '}
                <a
                    className="office-sponsor-bar-link"
                    href={SPONSOR_URL}
                    onClick={openWebsite}
                >
                    Database Client
                </a>
            </p>
        </div>
    );
}
