import { App } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWindowSize } from '../../util/reactUtils';
import { handler } from '../../util/vscode';
import { $t } from '../../i18n/i18nConfig';
import SponsorBar from '../components/SponsorBar';
import { VSCodeLogoSVG } from '../vscode';
import SvgCodeEditor from './SvgCodeEditor';
import {
    downloadSvg,
    ensureSvgNamespace,
    exportSvgAsPng,
    formatSvg,
    getFileNameFromPath,
    parseSvgColors,
    updateSvgBackground,
    updateSvgFill,
} from './svgUtils';
import { loadSvgLineWrap, saveSvgLineWrap } from './svgViewerSettings';
import './SvgViewer.less';

const NARROW_WIDTH_BREAKPOINT = 640;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 5;

function FormatIcon() {
    return (
        <svg className="svg-viewer__btn-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <path fill="currentColor" d="M4 2.5h8v1H4zm0 3h5v1H4zm0 3h7v1H4zm0 3h4v1H4z" opacity="0.45" />
            <path fill="currentColor" d="M10.5 8.5 13 11l-2.5 2.5-.7-.7L11.6 11l-1.8-1.8z" />
        </svg>
    );
}

function LineWrapIcon() {
    return (
        <svg className="svg-viewer__btn-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <path fill="currentColor" d="M2 3.5h12v1H2zm0 3h8v1H2zm0 3h10v1H2zm0 3h6v1H2z" />
            <path fill="currentColor" d="M12.5 9.5 15 12l-2.5 2.5-.7-.7L13.6 12l-1.8-1.8z" opacity="0.75" />
        </svg>
    );
}

function SaveIcon() {
    return (
        <svg className="svg-viewer__btn-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <path fill="currentColor" d="M3 1h7l3 3v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1m1 2v3h6V3H4m0 5v4h6V8H4" />
        </svg>
    );
}

function CopyIcon() {
    return (
        <svg className="svg-viewer__btn-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <path fill="currentColor" d="M4 2a2 2 0 0 0-2 2v8h1V4a1 1 0 0 1 1-1h6V2zm2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2m0 1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z" />
        </svg>
    );
}

function ExportIcon() {
    return (
        <svg className="svg-viewer__btn-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <path fill="currentColor" d="M8 2.5a.5.5 0 0 1 .5.5v6.793l2.146-2.147.708.708-3.15 3.15a.5.5 0 0 1-.708 0l-3.15-3.15.708-.708L7.5 9.793V3a.5.5 0 0 1 .5-.5" />
            <path fill="currentColor" d="M3.5 12.5a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 0 1H4a.5.5 0 0 1-.5-.5" />
        </svg>
    );
}

function PngIcon() {
    return (
        <svg className="svg-viewer__btn-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <path fill="currentColor" d="M2.5 3A1.5 1.5 0 0 0 1 4.5v7A1.5 1.5 0 0 0 2.5 13h11a1.5 1.5 0 0 0 1.5-1.5v-7A1.5 1.5 0 0 0 13.5 3zM2 4.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5z" />
            <path fill="currentColor" d="M5 10.5 6.75 8l1.5 1.75L10 7.5 12 10.5z" />
        </svg>
    );
}

function SvgViewerInner() {
    const { message } = App.useApp();
    const [content, setContent] = useState('');
    const [fileName, setFileName] = useState('image.svg');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [exportingPng, setExportingPng] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [lineWrap, setLineWrap] = useState(loadSvgLineWrap);
    const [isGitScheme, setIsGitScheme] = useState(false);

    const contentRef = useRef('');
    const lastSavedRef = useRef('');
    const dirtyRef = useRef(false);
    const filePathRef = useRef('');
    const canvasWrapRef = useRef<HTMLDivElement>(null);
    const offsetRef = useRef({ x: 0, y: 0 });
    const dragRef = useRef<{ startX: number; startY: number; offsetX: number; offsetY: number } | null>(null);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [dragging, setDragging] = useState(false);

    const onToggleLineWrap = useCallback(() => {
        setLineWrap((enabled) => {
            const next = !enabled;
            saveSvgLineWrap(next);
            return next;
        });
    }, []);
    const copySuccessText = $t('svg.copySuccess');
    const saveText = $t('common.save');
    const lineWrapText = $t('svg.lineWrap');

    const colors = useMemo(() => parseSvgColors(content), [content]);
    const [width] = useWindowSize();
    const effectiveWidth = width || window.innerWidth;
    const isNarrowWidth = effectiveWidth <= NARROW_WIDTH_BREAKPOINT;
    const previewOnly = isGitScheme || isNarrowWidth;
    const previewUrl = useMemo(() => {
        const trimmed = content.trim();
        if (!trimmed) {
            return '';
        }
        const blob = new Blob([ensureSvgNamespace(trimmed)], { type: 'image/svg+xml;charset=utf-8' });
        return URL.createObjectURL(blob);
    }, [content]);

    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    useEffect(() => {
        offsetRef.current = offset;
    }, [offset]);

    useEffect(() => {
        const el = canvasWrapRef.current;
        if (!el) {
            return;
        }
        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            const factor = Math.pow(1.001, -e.deltaY);
            setZoom((value) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value * factor)));
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, [previewUrl, loading]);

    const onPreviewMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (e.button !== 0) {
            return;
        }
        e.preventDefault();
        dragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            offsetX: offsetRef.current.x,
            offsetY: offsetRef.current.y,
        };
        setDragging(true);

        const onMouseMove = (ev: MouseEvent) => {
            const drag = dragRef.current;
            if (!drag) {
                return;
            }
            setOffset({
                x: drag.offsetX + ev.clientX - drag.startX,
                y: drag.offsetY + ev.clientY - drag.startY,
            });
        };

        const onMouseUp = () => {
            dragRef.current = null;
            setDragging(false);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    }, []);

    const applyContent = useCallback((text: string) => {
        setContent(text);
        contentRef.current = text;
        lastSavedRef.current = text;
        dirtyRef.current = false;
        setDirty(false);
    }, []);

    useEffect(() => {
        handler
            .on('open', ({ path, scheme, content, error: openError }) => {
                filePathRef.current = path;
                setFileName(getFileNameFromPath(path));
                setIsGitScheme(scheme === 'git');
                setLoading(false);
                if (openError) {
                    setError(openError);
                    return;
                }
                setError('');
                applyContent(content ?? '');
            })
            .emit('init');
    }, [applyContent]);

    useEffect(() => {
        handler.on('saveDone', () => {
            lastSavedRef.current = contentRef.current;
            dirtyRef.current = false;
            setDirty(false);
        });
    }, []);

    const updateContent = useCallback((value: string) => {
        setContent(value);
        contentRef.current = value;
        const isDirty = value !== lastSavedRef.current;
        if (isDirty && !dirtyRef.current) {
            handler.emit('change');
        }
        dirtyRef.current = isDirty;
        setDirty(isDirty);
    }, []);

    const onSave = useCallback(() => {
        const value = contentRef.current;
        if (value === lastSavedRef.current) {
            return;
        }
        handler.emit('save', value);
    }, []);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') {
                e.preventDefault();
                onSave();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onSave]);

    const onFormat = () => {
        updateContent(formatSvg(content));
    };

    const onBackgroundColorChange = (color: string) => {
        updateContent(updateSvgBackground(content, color));
    };

    const onFillColorChange = (color: string) => {
        updateContent(updateSvgFill(content, color));
    };

    const onCopy = async () => {
        await navigator.clipboard.writeText(content);
        message.success({
            duration: 2,
            content: copySuccessText,
        });
    };

    const onExport = () => {
        downloadSvg(content, fileName);
    };

    const onExportPng = async () => {
        setExportingPng(true);
        try {
            await exportSvgAsPng(content, fileName);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to export PNG');
        } finally {
            setExportingPng(false);
        }
    };

    return (
        <div className="svg-viewer">
            {loading && <div className="svg-viewer__loading">Loading SVG…</div>}
            {error && <div className="svg-viewer__error">{error}</div>}
            {!loading && (
                <div className={`svg-viewer__main${previewOnly ? ' svg-viewer__main--preview-only' : ''}`}>
                    {!previewOnly && <div className="svg-viewer__panel svg-viewer__panel--code">
                        <div className="svg-viewer__header">
                            <span className="svg-viewer__title">SVG</span>
                            <div className="svg-viewer__actions">
                                <button
                                    type="button"
                                    className={`svg-viewer__btn svg-viewer__btn--icon-only${lineWrap ? ' svg-viewer__btn--active' : ''}`}
                                    onClick={onToggleLineWrap}
                                    title={lineWrapText}
                                    aria-label={lineWrapText}
                                    aria-pressed={lineWrap}
                                >
                                    <LineWrapIcon />
                                </button>
                                <button
                                    type="button"
                                    className={`svg-viewer__btn${dirty ? ' svg-viewer__btn--primary' : ''}`}
                                    onClick={onSave}
                                    disabled={!dirty}
                                    title={dirty ? 'Ctrl+S' : undefined}
                                >
                                    <SaveIcon />
                                    {saveText}
                                </button>
                                <button
                                    type="button"
                                    className="svg-viewer__btn"
                                    onClick={() => handler.emit('editInVSCode', true)}
                                >
                                    <span className="svg-viewer__vscode-icon" aria-hidden="true">
                                        <VSCodeLogoSVG />
                                    </span>
                                    Open
                                </button>
                                <button type="button" className="svg-viewer__btn" onClick={onFormat}>
                                    <FormatIcon />
                                    Format
                                </button>
                            </div>
                        </div>
                        <SvgCodeEditor
                            value={content}
                            onChange={updateContent}
                            lineWrap={lineWrap}
                        />
                    </div>}

                    <div className="svg-viewer__panel svg-viewer__panel--preview">
                        <div className="svg-viewer__header">
                            <span className="svg-viewer__title">Preview</span>
                        </div>
                        {!previewOnly && <div className="svg-viewer__controls">
                            <div className="svg-viewer__control-row">
                                <span className="svg-viewer__label">FILL</span>
                                <input
                                    type="color"
                                    className="svg-viewer__color"
                                    value={colors.fill.startsWith('#') ? colors.fill : '#409eff'}
                                    onChange={(e) => onFillColorChange(e.target.value)}
                                    aria-label="Fill color"
                                />
                                <input
                                    type="text"
                                    className="svg-viewer__hex"
                                    value={colors.fill}
                                    onChange={(e) => onFillColorChange(e.target.value)}
                                    spellCheck={false}
                                />
                            </div>
                            <div className="svg-viewer__control-row">
                                <span className="svg-viewer__label">BACKGROUND</span>
                                <input
                                    type="color"
                                    className="svg-viewer__color"
                                    value={colors.background.startsWith('#') ? colors.background : '#ffffff'}
                                    onChange={(e) => onBackgroundColorChange(e.target.value)}
                                    aria-label="Background color"
                                />
                                <input
                                    type="text"
                                    className="svg-viewer__hex"
                                    value={colors.background}
                                    onChange={(e) => onBackgroundColorChange(e.target.value)}
                                    spellCheck={false}
                                />
                            </div>
                        </div>}
                        <div
                            ref={canvasWrapRef}
                            className={`svg-viewer__canvas-wrap${dragging ? ' svg-viewer__canvas-wrap--dragging' : ''}`}
                            onMouseDown={onPreviewMouseDown}
                        >
                            {previewUrl ? (
                                <img
                                    className="svg-viewer__preview-img"
                                    src={previewUrl}
                                    alt="SVG preview"
                                    draggable={false}
                                    style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }}
                                />
                            ) : null}
                        </div>
                        <div className="svg-viewer__panel-footer">
                            <button type="button" className="svg-viewer__btn svg-viewer__btn--primary" onClick={onCopy}>
                                <CopyIcon />
                                Copy
                            </button>
                            <button type="button" className="svg-viewer__btn" onClick={onExport}>
                                <ExportIcon />
                                Export
                            </button>
                            <button
                                type="button"
                                className="svg-viewer__btn"
                                onClick={onExportPng}
                                disabled={exportingPng}
                            >
                                <PngIcon />
                                Export PNG
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {getConfigs()?.sponsorBaseUrl
                ? <footer className="svg-viewer__sponsor-footer"><SponsorBar placement="center" /></footer>
                : <div style={{ height: 16 }} />
            }
        </div>
    );
}

export default function SvgViewer() {
    return (
        <App>
            <SvgViewerInner />
        </App>
    );
}
