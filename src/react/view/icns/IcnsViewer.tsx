import { Alert, Layout, Spin } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { handler } from '../../util/vscode';
import { loadOfficeBuffer } from '../../util/loadOfficeContent';
import { useVscodeSponsorDark } from '../../util/vscodeTheme';
import Sponsor from '../components/Sponsor';
import { IcnsIconItem, parseIcnsIcons } from './icnsParser';
import './IcnsViewer.css';

const { Sider, Content } = Layout;
const SIDER_WIDTH = 200;

export default function IcnsViewer() {
    const [icons, setIcons] = useState<IcnsIconItem[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const sponsorDark = useVscodeSponsorDark();

    const loadIcns = useCallback(async (payload: { path?: string; buffer?: number[]; error?: string }) => {
        setLoading(true);
        setError(null);
        setIcons([]);
        setSelectedId(null);

        try {
            const buffer = await loadOfficeBuffer(payload);
            const items = await parseIcnsIcons(buffer);
            setIcons(items);
            setSelectedId(items[items.length - 1]?.id ?? null);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load ICNS file');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        handler.on('open', (payload) => {
            loadIcns(payload);
        }).emit('init');
    }, [loadIcns]);

    const selected = icons.find(icon => icon.id === selectedId) ?? null;

    return (
        <Layout className="icns-viewer office-viewer-themed">
            <Layout className="icns-body">
                <Sider width={SIDER_WIDTH} className="icns-sider">
                    <div className="icns-sider-inner">
                        <div className="icns-sider-header">Iconset</div>
                        <div className="icns-size-list">
                            {icons.map(icon => (
                                <div
                                    key={icon.id}
                                    className={`icns-size-item${selectedId === icon.id ? ' is-active' : ''}`}
                                    onClick={() => setSelectedId(icon.id)}
                                >
                                    <div className="icns-size-thumb">
                                        <img src={icon.dataUrl} alt={icon.label} draggable={false} />
                                    </div>
                                    <span className="icns-size-label">{icon.label}</span>
                                </div>
                            ))}
                        </div>
                        <div className="icns-sider-bottom">
                            <Sponsor variant="sidebar" dark={sponsorDark} />
                        </div>
                    </div>
                </Sider>
                <Content className="icns-main">
                    {loading && (
                        <div className="icns-empty">
                            <Spin tip="Loading ICNS…" />
                        </div>
                    )}
                    {!loading && error && (
                        <div className="icns-empty">
                            <Alert type="error" showIcon message={error} />
                        </div>
                    )}
                    {!loading && !error && selected && (
                        <div className="icns-preview-wrap">
                            <img
                                className="icns-preview-image"
                                src={selected.dataUrl}
                                alt={selected.label}
                                draggable={false}
                            />
                        </div>
                    )}
                    {!loading && !error && !selected && (
                        <div className="icns-empty">No icon sizes available</div>
                    )}
                </Content>
            </Layout>
        </Layout>
    );
}
