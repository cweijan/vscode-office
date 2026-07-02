import { MinusOutlined, MoonOutlined, PlusOutlined, SunOutlined } from '@ant-design/icons';
import { Alert, Button, Layout, Spin } from 'antd';
import MindElixir, { type MindElixirData, type MindElixirInstance } from 'mind-elixir';
import { useCallback, useEffect, useRef, useState } from 'react';
import { handler } from '../../util/vscode';
import { loadOfficeBuffer } from '../../util/loadOfficeContent';
import { observeVscodeThemeChange } from '../../util/vscodeTheme';
import SponsorBar from '../components/SponsorBar';
import { buildMindElixirTheme } from './mindElixirTheme';
import { parseXmind, XmindDocument, XmindSheet } from './xmindParser';
import './XmindViewer.css';

const { Sider, Content } = Layout;
const SIDER_WIDTH = 220;
const ZOOM_STEP = 0.1;

function attachScaleListener(mind: MindElixirInstance, onScale: (value: number) => void) {
    mind.bus.addListener('scale', onScale);
    onScale(mind.scaleVal);
}

function detachScaleListener(mind: MindElixirInstance, onScale: (value: number) => void) {
    mind.bus.removeListener('scale', onScale);
}

export default function XmindViewer() {
    const mapRef = useRef<HTMLDivElement>(null);
    const mindRef = useRef<MindElixirInstance | null>(null);
    const documentRef = useRef<XmindDocument | null>(null);
    const scaleHandlerRef = useRef<((value: number) => void) | null>(null);
    const [sheets, setSheets] = useState<XmindSheet[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [scalePercent, setScalePercent] = useState(100);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dark, setDark] = useState(false);

    const destroyMind = useCallback(() => {
        const mind = mindRef.current;
        const handler = scaleHandlerRef.current;
        if (mind && handler) {
            detachScaleListener(mind, handler);
        }
        scaleHandlerRef.current = null;
        mindRef.current?.destroy();
        mindRef.current = null;
    }, []);

    const renderSheet = useCallback((data: MindElixirData, resolveImageUrl: (url: string) => string, adaptive: boolean) => {
        const el = mapRef.current;
        if (!el) {
            return;
        }
        const onScale = (value: number) => {
            setScalePercent(Math.round(value * 100));
        };
        if (mindRef.current) {
            mindRef.current.changeTheme(buildMindElixirTheme(adaptive), false);
            mindRef.current.refresh(data);
            mindRef.current.scaleFit();
            return;
        }
        const mind = new MindElixir({
            el,
            direction: MindElixir.SIDE,
            editable: false,
            contextMenu: false,
            toolBar: false,
            keypress: false,
            imageProxy: resolveImageUrl,
            theme: buildMindElixirTheme(adaptive),
        });
        mind.init(data);
        mind.scaleFit();
        scaleHandlerRef.current = onScale;
        attachScaleListener(mind, onScale);
        mindRef.current = mind;
    }, []);

    const zoomOut = useCallback(() => {
        const mind = mindRef.current;
        if (!mind) {
            return;
        }
        mind.scale(Math.max(mind.scaleMin, mind.scaleVal - ZOOM_STEP));
    }, []);

    const zoomIn = useCallback(() => {
        const mind = mindRef.current;
        if (!mind) {
            return;
        }
        mind.scale(Math.min(mind.scaleMax, mind.scaleVal + ZOOM_STEP));
    }, []);

    const toggleDark = useCallback(() => {
        setDark(prev => !prev);
    }, []);

    const loadXmind = useCallback(async (payload: { path?: string; buffer?: number[]; error?: string; fileName?: string }) => {
        setLoading(true);
        setError(null);
        setSheets([]);
        setSelectedId(null);
        setScalePercent(100);
        documentRef.current?.dispose();
        documentRef.current = null;
        destroyMind();

        try {
            const buffer = await loadOfficeBuffer(payload);
            const fileName = payload.fileName ?? payload.path?.split('/').pop() ?? 'document.xmind';
            const parsed = await parseXmind(buffer, fileName);
            if (!parsed.sheets.length) {
                throw new Error('No sheets found in XMind file');
            }
            documentRef.current = parsed;
            setSheets(parsed.sheets);
            setSelectedId(parsed.sheets[0].id);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load XMind file');
        } finally {
            setLoading(false);
        }
    }, [destroyMind]);

    useEffect(() => {
        handler.on('open', (payload) => {
            loadXmind(payload);
        }).emit('init');

        return () => {
            documentRef.current?.dispose();
            documentRef.current = null;
            destroyMind();
        };
    }, [loadXmind, destroyMind]);

    const selected = sheets.find(sheet => sheet.id === selectedId) ?? null;

    useEffect(() => {
        if (!selected || loading || !documentRef.current) {
            return;
        }
        renderSheet(selected.data, documentRef.current.resolveImageUrl, dark);
    }, [selected, loading, renderSheet, dark]);

    useEffect(() => {
        mindRef.current?.changeTheme(buildMindElixirTheme(dark));
    }, [dark]);

    useEffect(() => {
        if (!dark) {
            return;
        }
        return observeVscodeThemeChange(() => {
            mindRef.current?.changeTheme(buildMindElixirTheme(true));
        });
    }, [dark]);

    const showSidebar = sheets.length > 1;

    return (
        <Layout className={`xmind-viewer${dark ? ' xmind-dark' : ''}`}>
            <Layout className="xmind-body">
                {showSidebar && (
                    <Sider width={SIDER_WIDTH} className="xmind-sider">
                        <div className="xmind-sider-inner">
                            <div className="xmind-sider-header">Sheets</div>
                            <div className="xmind-sheet-list">
                                {sheets.map(sheet => (
                                    <div
                                        key={sheet.id}
                                        className={`xmind-sheet-item${selectedId === sheet.id ? ' is-active' : ''}`}
                                        title={sheet.title}
                                        onClick={() => setSelectedId(sheet.id)}
                                    >
                                        {sheet.title}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Sider>
                )}
                <Content className="xmind-main">
                    {!loading && error && (
                        <div className="xmind-empty">
                            <Alert type="error" showIcon message={error} />
                        </div>
                    )}
                    {!loading && !error && selected && (
                        <div className="xmind-map-wrap">
                            {!showSidebar && (
                                <div className="xmind-map-toolbar">
                                    <span className="xmind-map-title">{selected.title}</span>
                                </div>
                            )}
                            <div ref={mapRef} className="xmind-map" />
                            <div className="xmind-map-footer">
                                <SponsorBar placement="left" />
                                <div className="xmind-zoom-controls">
                                    <Button
                                        type="text"
                                        size="small"
                                        className="xmind-zoom-btn"
                                        icon={<MinusOutlined />}
                                        aria-label="Zoom out"
                                        onClick={zoomOut}
                                    />
                                    <span className="xmind-zoom-label">{scalePercent}%</span>
                                    <Button
                                        type="text"
                                        size="small"
                                        className="xmind-zoom-btn"
                                        icon={<PlusOutlined />}
                                        aria-label="Zoom in"
                                        onClick={zoomIn}
                                    />
                                </div>
                                <button
                                    type="button"
                                    className="xmind-theme-toggle"
                                    title={dark ? '切换亮色' : '切换暗色（跟随 VS Code 主题）'}
                                    aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
                                    onClick={toggleDark}
                                >
                                    {dark ? <SunOutlined /> : <MoonOutlined />}
                                </button>
                            </div>
                        </div>
                    )}
                    {!loading && !error && !selected && (
                        <div className="xmind-empty">No content available</div>
                    )}
                </Content>
            </Layout>
            <Spin spinning={loading} fullscreen tip="Loading XMind…" />
        </Layout>
    );
}
