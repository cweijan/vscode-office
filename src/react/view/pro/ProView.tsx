import { useState, useEffect } from 'react';
import { handler } from '../../util/vscode';
import { getConfigs } from '../../util/vscodeConfig';
import './ProView.css';

const FREE_FEATURES = [
    'Word, Excel, PowerPoint preview',
    'PDF & eBook viewer',
    'WYSIWYG Markdown editor',
    'Archive browser (zip, rar, 7z…)',
    'Design file viewer (PSD, SVG, HEIC…)',
    'Git history browser',
];

const PRO_FEATURES = [
    { text: 'Everything in Free', bold: false, muted: true },
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
    const [modalOpen, setModalOpen] = useState(false);
    const isDev = !!(getConfigs() as any)?.isDev;

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
        handler.on('proCurrentKey', (key: string | null) => setCurrentKey(key));
        handler.emit('proGetCurrentKey');
    }, []);

    function activate() {
        const key = licenseKey.trim();
        if (!key) return;
        setActivating(true);
        setStatus(null);
        handler.emit('proActivate', key);
    }

    function openModal() {
        setStatus(null);
        setModalOpen(true);
    }

    function closeModal() {
        setModalOpen(false);
        setStatus(null);
        setLicenseKey('');
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
                        I'm the author of Office Viewer. I've recently resumed active maintenance — fixing bugs,
                        improving compatibility, and shipping new features.
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
                        <div className="pro-plan-title">Standard License</div>
                        <div className="pro-plan-desc">Everything you need to preview and edit office files in VS Code.</div>
                        <div className="pro-plan-price">$0</div>
                        <div className="pro-plan-price-sub">Open source, free forever.</div>
                        <button
                            className="pro-plan-btn"
                            onClick={() => handler.emit('openLink', 'https://marketplace.visualstudio.com/items?itemName=cweijan.vscode-office')}
                        >
                            Already Installed
                        </button>
                        <div className="pro-plan-divider" />
                        <ul className="pro-plan-features">
                            {FREE_FEATURES.map(f => (
                                <li key={f}>{codicon('check')} {f}</li>
                            ))}
                        </ul>
                    </div>

                    <div className="pro-plan-card pro-plan-card--pro">
                        <div className="pro-plan-title pro-plan-title--pro">Lifetime License</div>
                        <div className="pro-plan-desc">Unlock customization and beautiful exports. Pay once, use forever.</div>
                        <div className="pro-plan-price">$28</div>
                        <div className="pro-plan-price-sub">One-time payment, no renewal fees.</div>
                        <button
                            className="pro-plan-btn pro-plan-btn--primary"
                            onClick={() => handler.emit('openLink', 'https://office-viewer.app/pricing')}
                        >
                            Get Pro →
                        </button>
                        {currentKey
                            ? <div className="pro-active-badge">{codicon('verified')} Pro Active</div>
                            : <button className="pro-activate-trigger" onClick={openModal}>{codicon('key')} Activate License</button>
                        }
                        <div className="pro-plan-divider" />
                        <ul className="pro-plan-features">
                            {PRO_FEATURES.map(f => (
                                <li key={f.text} className={[f.muted ? 'muted' : '', f.bold ? 'bold' : ''].join(' ').trim()}>
                                    {codicon('verified')} {f.text}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

            </div>

            {/* Dev-only: clear license button */}
            {isDev && (
                <button
                    className="pro-dev-clear"
                    title="[Dev] Clear license key"
                    onClick={() => handler.emit('proClearKey')}
                >
                    {codicon('trash')} Clear License
                </button>
            )}

            {/* Modal */}
            {modalOpen && (
                <div className="pro-modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
                    <div className="pro-modal">
                        <div className="pro-modal-header">
                            <span className="pro-modal-title">{codicon('key')} Activate License</span>
                            <button className="pro-modal-close" onClick={closeModal}>{codicon('close')}</button>
                        </div>
                        <p className="pro-modal-desc">
                            Enter your license key to unlock Pro features. You can find it in your purchase confirmation email.
                        </p>
                        <div className="pro-modal-row">
                            <input
                                className="pro-modal-input"
                                placeholder="XXXXX-XXXXX-XXXXX-XXXXX"
                                value={licenseKey}
                                onChange={e => { setLicenseKey(e.target.value); setStatus(null); }}
                                onKeyDown={e => e.key === 'Enter' && activate()}
                                autoFocus
                            />
                        </div>
                        {status && (
                            <div className={`pro-modal-status pro-modal-status--${status.type}`}>
                                {codicon(status.type === 'success' ? 'check-all' : 'error')} {status.msg}
                            </div>
                        )}
                        <div className="pro-modal-actions">
                            <button className="pro-modal-btn-cancel" onClick={closeModal}>Cancel</button>
                            <button
                                className="pro-modal-btn-confirm"
                                onClick={activate}
                                disabled={activating || !licenseKey.trim()}
                            >
                                {activating ? 'Activating…' : 'Activate'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
