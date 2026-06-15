import { Alert, Layout, Spin } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { handler } from '../../util/vscode';
import { useVscodeSponsorDark } from '../../util/vscodeTheme';
import Sponsor from '../components/Sponsor';
import {
    getCompositeId,
    getDefaultSelection,
    getPreviewDataUrl,
    parsePsd,
    PsdDocument,
    PsdLayerItem,
} from './psdParser';
import './PsdViewer.css';

const { Sider, Content } = Layout;
const SIDER_WIDTH = 240;

function LayerRow({
    item,
    selectedId,
    onSelect,
}: {
    item: PsdLayerItem;
    selectedId: string | null;
    onSelect: (id: string) => void;
}) {
    const className = [
        'psd-layer-item',
        selectedId === item.id ? 'is-active' : '',
        item.hidden ? 'is-hidden' : '',
        item.isGroup ? 'is-group' : '',
    ].filter(Boolean).join(' ');

    return (
        <div
            className={className}
            style={{ paddingLeft: `${12 + item.depth * 16}px` }}
            onClick={() => onSelect(item.id)}
        >
            {item.dataUrl ? (
                <div className="psd-layer-thumb" style={{ marginLeft: 0 }}>
                    <img src={item.dataUrl} alt={item.name} draggable={false} />
                </div>
            ) : (
                <div className="psd-layer-thumb-placeholder" style={{ marginLeft: 0 }} />
            )}
            <span className="psd-layer-label" title={item.name}>{item.name}</span>
        </div>
    );
}

export default function PsdViewer() {
    const [document, setDocument] = useState<PsdDocument | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const sponsorDark = useVscodeSponsorDark();

    const loadPsd = useCallback(async (path: string) => {
        setLoading(true);
        setError(null);
        setDocument(null);
        setSelectedId(null);

        try {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`Failed to load PSD file (${response.status})`);
            }
            const buffer = await response.arrayBuffer();
            const parsed = parsePsd(buffer);
            setDocument(parsed);
            setSelectedId(getDefaultSelection(parsed));
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load PSD file');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        handler.on('open', ({ path }) => {
            loadPsd(path);
        }).emit('init');
    }, [loadPsd]);

    const previewDataUrl = document && selectedId ? getPreviewDataUrl(document, selectedId) : null;
    const compositeId = getCompositeId();

    return (
        <Layout className="psd-viewer office-viewer-themed">
            <Layout className="psd-body">
                <Sider width={SIDER_WIDTH} className="psd-sider">
                    <div className="psd-sider-inner">
                        <div className="psd-sider-header">Layers</div>
                        <div className="psd-layer-list">
                            {document?.compositeDataUrl && (
                                <div
                                    className={`psd-layer-item${selectedId === compositeId ? ' is-active' : ''}`}
                                    style={{ paddingLeft: '12px' }}
                                    onClick={() => setSelectedId(compositeId)}
                                >
                                    <div className="psd-layer-thumb">
                                        <img src={document.compositeDataUrl} alt="Composite" draggable={false} />
                                    </div>
                                    <span className="psd-layer-label">Composite</span>
                                </div>
                            )}
                            {document?.layers.map(layer => (
                                <LayerRow
                                    key={layer.id}
                                    item={layer}
                                    selectedId={selectedId}
                                    onSelect={setSelectedId}
                                />
                            ))}
                        </div>
                        <div className="psd-sider-bottom">
                            <Sponsor variant="sidebar" dark={sponsorDark} />
                        </div>
                    </div>
                </Sider>
                <Content className="psd-main">
                    {loading && (
                        <div className="psd-empty">
                            <Spin tip="Loading PSD…" />
                        </div>
                    )}
                    {!loading && error && (
                        <div className="psd-empty">
                            <Alert type="error" showIcon message={error} />
                        </div>
                    )}
                    {!loading && !error && previewDataUrl && (
                        <div className="psd-preview-wrap">
                            <img
                                className="psd-preview-image"
                                src={previewDataUrl}
                                alt="PSD preview"
                                draggable={false}
                            />
                        </div>
                    )}
                    {!loading && !error && document && !previewDataUrl && (
                        <div className="psd-empty">No preview available for this layer</div>
                    )}
                </Content>
            </Layout>
        </Layout>
    );
}
