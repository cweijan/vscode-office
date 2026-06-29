import { useState, useEffect } from 'react';
import { handler } from '../../util/vscode';
import './ProView.css';

const API_HOST = 'https://api.office-viewer.app';

const FREE_FEATURES = [
    'Word, Excel, PowerPoint preview',
    'PDF & eBook viewer',
    'WYSIWYG Markdown editor',
    'Archive browser (zip, rar, 7z…)',
    'Design file viewer (PSD, SVG, HEIC…)',
    'Git history browser',
];

const PRO_FEATURES = [
    { text: 'Everything in Free', bold: false },
    { text: 'Remove Sponsor banner from viewer', bold: true },
    { text: 'Custom font color & background color', bold: true },
    { text: 'Beautiful PDF / DOCX / HTML export', bold: true },
    { text: 'Professional export templates', bold: true },
    { text: 'Lifetime license — pay once, use forever', bold: false },
];

export default function ProView() {
    const [licenseKey, setLicenseKey] = useState('');
    const [activating, setActivating] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
    const [currentKey, setCurrentKey] = useState<string | null>(null);

    useEffect(() => {
        handler.on('proActivateResult', (result: { success: boolean; key?: string; error?: string }) => {
            setActivating(false);
            if (result.success) {
                setStatus({ type: 'success', msg: 'License activated successfully!' });
                setCurrentKey(result.key ?? null);
                setLicenseKey('');
            } else {
                setStatus({ type: 'error', msg: result.error ?? 'Invalid license key.' });
            }
        });
        handler.on('proCurrentKey', (key: string | null) => {
            setCurrentKey(key);
        });
        handler.emit('proGetCurrentKey');
    }, []);

    function activate() {
        const key = licenseKey.trim();
        if (!key) return;
        setActivating(true);
        setStatus(null);
        handler.emit('proActivate', key);
    }

    function openPurchase() {
        handler.emit('openLink', 'https://office-viewer.app/pricing');
    }

    const codicon = (name: string) => (
        <span className={`codicon codicon-${name}`} aria-hidden />
    );

    return (
        <div className="pro-page office-viewer-themed">
            <div className="pro-page-inner">

                {/* Author letter */}
                <div className="pro-letter">
                    <p>Hi there,</p>
                    <p>
                        I'm the author of Office Viewer. After a period of stepping back, I've restarted active
                        maintenance of the extension — fixing bugs, improving compatibility, and adding new features.
                    </p>
                    <p>
                        To sustain ongoing development, I've moved a small set of advanced features to a Pro license.
                        Everything that was free before remains free and open source. The Pro features are new
                        additions on top of the free core.
                    </p>
                    <p>— Weijan Chen</p>
                </div>

                {/* Plans */}
                <div className="pro-plans">
                    <div className="pro-plan-card">
                        <div className="pro-plan-title">Free</div>
                        <div className="pro-plan-price">$0</div>
                        <div className="pro-plan-price-sub">Open source, free forever.</div>
                        <ul className="pro-plan-features">
                            {FREE_FEATURES.map(f => (
                                <li key={f}>{codicon('check')} {f}</li>
                            ))}
                        </ul>
                        <button className="pro-plan-btn pro-plan-btn--free" onClick={() => handler.emit('openLink', 'https://marketplace.visualstudio.com/items?itemName=cweijan.vscode-office')}>
                            Already Installed
                        </button>
                    </div>

                    <div className="pro-plan-card pro-plan-card--pro">
                        <div className="pro-plan-title">Pro</div>
                        <div className="pro-plan-price">$28</div>
                        <div className="pro-plan-price-sub">One-time payment, no renewal fees.</div>
                        <ul className="pro-plan-features">
                            {PRO_FEATURES.map(f => (
                                <li key={f.text} className={f.bold ? 'bold' : ''}>
                                    {codicon('verified')} {f.text}
                                </li>
                            ))}
                        </ul>
                        <button className="pro-plan-btn" onClick={openPurchase}>
                            Get Pro License →
                        </button>
                    </div>
                </div>

                {/* Activate */}
                <div className="pro-activate">
                    <h3>Activate License</h3>
                    <div className="pro-activate-row">
                        <input
                            className="pro-activate-input"
                            placeholder="XXXXX-XXXXX-XXXXX-XXXXX"
                            value={licenseKey}
                            onChange={e => { setLicenseKey(e.target.value); setStatus(null); }}
                            onKeyDown={e => e.key === 'Enter' && activate()}
                        />
                        <button
                            className="pro-activate-btn"
                            onClick={activate}
                            disabled={activating || !licenseKey.trim()}
                        >
                            {activating ? 'Activating…' : 'Activate'}
                        </button>
                    </div>

                    {status && (
                        <div className={`pro-activate-status pro-activate-status--${status.type}`}>
                            {codicon(status.type === 'success' ? 'check-all' : 'error')}
                            {status.msg}
                        </div>
                    )}

                    {currentKey && !status && (
                        <div className="pro-current-key">
                            {codicon('verified')} Active: <code>{currentKey}</code>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
