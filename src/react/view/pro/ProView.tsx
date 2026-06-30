import { useState, useEffect } from 'react';
import { handler } from '../../util/vscode';
import { getConfigs } from '../../util/vscodeConfig';
import './ProView.css';

const FREE_FEATURES = [
    'Git History Browser',
    'WYSIWYG Markdown Editor',
    'Excel Editor (xls, xlsx, csv, ods)',
    'Archive Explorer (Zip, Rar, 7z…)',
    'Design File Viewer (PSD, SVG, HEIC…)',
    'Word, PowerPoint, PDF & eBook Viewer',
    'Community Support (GitHub Issues)',
];

const PRO_FEATURES = [
    { text: 'Everything in Free', bold: false, muted: true },
    { text: 'Remove Sponsor Element', bold: true },
    { text: 'Beautiful PDF / HTML Export', bold: true },
    { text: 'Adjust Image Width & Height', bold: true },
    { text: 'Custom Font Color & Background Color', bold: true },
    { text: 'Lifetime License — Pay Once, Use Forever', bold: false },
];

export default function ProView() {
    const [licenseKey, setLicenseKey] = useState('');
    const [activating, setActivating] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
    const [currentKey, setCurrentKey] = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [activationSucceeded, setActivationSucceeded] = useState(false);
    const isDev = !!(getConfigs() as any)?.isDev;
    const language = String((getConfigs() as any)?.language || '').toLowerCase();
    const isChinese = language.startsWith('zh');

    useEffect(() => {
        handler.on('proActivateResult', (result: { success: boolean; key?: string; error?: string }) => {
            setActivating(false);
            if (result.success) {
                setStatus({ type: 'success', msg: 'License activated successfully!' });
                setCurrentKey(result.key ?? null);
                setLicenseKey('');
                setActivationSucceeded(true);
            } else {
                setStatus({ type: 'error', msg: result.error ?? 'Invalid license key.' });
                setActivationSucceeded(false);
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
        setActivationSucceeded(false);
        setModalOpen(true);
    }

    function closeModal() {
        setModalOpen(false);
        setStatus(null);
        setLicenseKey('');
        setActivationSucceeded(false);
    }

    const codicon = (name: string) => (
        <span className={`codicon codicon-${name}`} aria-hidden />
    );

    const logoSrc = (getConfigs() as any)?.logoUri as string | undefined;

    return (
        <div className="pro-page office-viewer-themed">
            <div className="pro-page-inner">

                {/* Author letter */}
                <div className="pro-letter">
                    {isChinese ? (
                        <>
                            <p className="pro-letter-greeting">你好，</p>
                            <p>
                                我是 Office Viewer 的开发者。最近我重新恢复对这个项目的持续维护，
                                包括修复问题、提升兼容性，以及持续加入一些新功能。
                            </p>
                            <p>
                                为了支持后续开发，我增加了一些新的 Pro 功能。
                                <strong> 之前免费的功能依然保持免费，并且继续开源。</strong>
                                Pro 功能是在原有免费能力之上的新增扩展。
                            </p>
                            <p className="pro-letter-signature">— Weijan Chen</p>
                        </>
                    ) : (
                        <>
                            <p className="pro-letter-greeting">Hi there,</p>
                            <p>
                                I'm the developer of Office Viewer. I've recently resumed active maintenance — fixing bugs,
                                improving compatibility, and shipping new features.
                            </p>
                            <p>
                                To sustain ongoing development, I've added some new Pro features.&nbsp;
                                <strong>Everything that was free before remains free and open source.</strong> The Pro features are new
                                additions on top of the free core.
                            </p>
                            <p className="pro-letter-signature">— Weijan Chen</p>
                        </>
                    )}
                </div>

                {/* Plans */}
                <div className="pro-plans">
                    <div className="pro-plan-card">
                        <div className="pro-plan-title">
                            {logoSrc && <img src={logoSrc} className="pro-card-logo" alt="" />}
                            Standard License
                        </div>
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
                                <li key={f}>{codicon('check')}<span className="pro-plan-feature-text">{f}</span></li>
                            ))}
                        </ul>
                    </div>

                    <div className="pro-plan-card pro-plan-card--pro">
                        <span className="pro-plan-badge">Recommended</span>
                        <div className="pro-plan-title pro-plan-title--pro">
                            {logoSrc && <img src={logoSrc} className="pro-card-logo" alt="" />}
                            Lifetime License
                        </div>
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
                                    {codicon('verified')}<span className="pro-plan-feature-text">{f.text}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

            </div>

            {/* Dev-only: clear license button */}
            {isDev && !!currentKey && (
                <button
                    className="pro-dev-clear"
                    title="[Dev] Clear license key"
                    onClick={() => {
                        handler.emit('proClearKey');
                        localStorage.removeItem('office.pro.badgeDismissed');
                    }}
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
                        <div className="pro-modal-body">
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
                        </div>
                        <div className="pro-modal-footer">
                            <button className="pro-modal-btn-cancel" onClick={closeModal}>{activationSucceeded ? 'Close' : 'Cancel'}</button>
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
