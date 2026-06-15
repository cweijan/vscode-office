import { App } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { handler } from '../../util/vscode';
import { getConfigs } from '../../util/vscodeConfig';
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
import './SvgViewer.less';

async function fetchSvgContent(path: string): Promise<string> {
    const response = await fetch(path);
    if (!response.ok) {
        throw new Error(`Failed to load SVG: ${response.status}`);
    }
    return response.text();
}

function FormatIcon() {
    return (
        <svg className="svg-viewer__btn-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <path fill="currentColor" d="M4 2.5h8v1H4zm0 3h5v1H4zm0 3h7v1H4zm0 3h4v1H4z" opacity="0.45" />
            <path fill="currentColor" d="M10.5 8.5 13 11l-2.5 2.5-.7-.7L11.6 11l-1.8-1.8z" />
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

    const contentRef = useRef('');
    const lastSavedRef = useRef('');
    const dirtyRef = useRef(false);
    const filePathRef = useRef('');
    const previewUrlRef = useRef('');

    const isZh = getConfigs()?.language?.startsWith('zh');
    const copySuccessText = isZh ? '已复制' : 'Copied';
    const saveText = isZh ? '保存' : 'Save';
    const saveSuccessText = isZh ? '保存成功' : 'Saved';

    const colors = useMemo(() => parseSvgColors(content), [content]);
    const [previewUrl, setPreviewUrl] = useState('');

    useEffect(() => {
        const trimmed = content.trim();
        if (!trimmed) {
            setPreviewUrl('');
            return;
        }

        const blob = new Blob([ensureSvgNamespace(trimmed)], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        if (previewUrlRef.current) {
            URL.revokeObjectURL(previewUrlRef.current);
        }
        previewUrlRef.current = url;
        setPreviewUrl(url);

        return () => {
            URL.revokeObjectURL(url);
            if (previewUrlRef.current === url) {
                previewUrlRef.current = '';
            }
        };
    }, [content]);

    const loadContent = useCallback(async (path: string) => {
        setLoading(true);
        setError('');
        try {
            const text = await fetchSvgContent(path);
            setContent(text);
            contentRef.current = text;
            lastSavedRef.current = text;
            dirtyRef.current = false;
            setDirty(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load SVG');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        handler
            .on('open', ({ path }) => {
                filePathRef.current = path;
                setFileName(getFileNameFromPath(path));
                setError('');
                loadContent(path);
            })
            .emit('init');
    }, [loadContent]);

    useEffect(() => {
        handler.on('fileChange', () => {
            if (dirtyRef.current || !filePathRef.current) return;
            loadContent(filePathRef.current);
        });
        handler.on('saveDone', () => {
            lastSavedRef.current = contentRef.current;
            dirtyRef.current = false;
            setDirty(false);
            message.success({
                duration: 2,
                content: saveSuccessText,
            });
        });
    }, [loadContent, message, saveSuccessText]);

    const updateContent = useCallback((value: string) => {
        setContent(value);
        contentRef.current = value;
        const isDirty = value !== lastSavedRef.current;
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
                <div className="svg-viewer__main">
                    <div className="svg-viewer__panel svg-viewer__panel--code">
                        <div className="svg-viewer__header">
                            <span className="svg-viewer__title">SVG</span>
                            <div className="svg-viewer__actions">
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
                        />
                    </div>

                    <div className="svg-viewer__panel svg-viewer__panel--preview">
                        <div className="svg-viewer__header">
                            <span className="svg-viewer__title">Preview</span>
                        </div>
                        <div className="svg-viewer__controls">
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
                        </div>
                        <div className="svg-viewer__canvas-wrap">
                            {previewUrl ? (
                                <img
                                    className="svg-viewer__preview-img"
                                    src={previewUrl}
                                    alt="SVG preview"
                                    draggable={false}
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
            <footer className="svg-viewer__sponsor-footer">
                <SponsorBar placement="center" />
            </footer>
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
