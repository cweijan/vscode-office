import { LeftOutlined, MoonOutlined, RightOutlined, SunOutlined } from "@ant-design/icons";
import { App, Button, Modal, Radio, Spin } from "antd";
import { useCallback, useEffect, useRef, useState } from "react";
import { handler, loadDarkMode, applyDarkMode } from "../../util/vscode.ts";
import { loadOfficeBuffer } from "../../util/loadOfficeContent.ts";
import SponsorBar from '../components/SponsorBar';
import './Excel.less';
import { MIN_VIEW_COLS, MIN_VIEW_ROWS } from "./excel_meta.ts";
import { detectCsvEncoding } from "./csvEncoding.ts";
import { loadSheets } from "./excel_reader.ts";
import { export_xlsx, exportSaveAs, buildFormattingSnapshot, hasFormattingChanged } from "./excel_writer.ts";
import Spreadsheet from './x-spreadsheet/index';
import FindReplacePanel from './FindReplacePanel';
import { parseSpreadsheetLink } from './excel_hyperlink';
import { initExcelLocale, t } from './excel_i18n';

initExcelLocale();

type ExcelViewState = { ri: number; ci: number; sheetIndex: number };

const EXCEL_VIEW_STATE_SUFFIX = '-excel-view';
const DEFAULT_PARQUET_PAGE_SIZE = 10000;
const PARQUET_PAGE_SIZE_OPTIONS = [1000, 10000, 50000];

interface ParquetPageState {
    pageIndex: number;
    pageSize: number;
    totalRows: number;
    totalPages: number;
}

function getViewStateKey(documentCacheId: string): string {
    return `${documentCacheId}${EXCEL_VIEW_STATE_SUFFIX}`;
}

function loadViewState(documentCacheId: string): ExcelViewState | null {
    if (!documentCacheId) return null;
    const key = getViewStateKey(documentCacheId);
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        return JSON.parse(raw) as ExcelViewState;
    } catch {
        return null;
    }
}

function saveViewState(documentCacheId: string, view: ExcelViewState) {
    if (!documentCacheId) return;
    const key = getViewStateKey(documentCacheId);
    try {
        localStorage.setItem(key, JSON.stringify(view));
    } catch {
        // ignore quota / private mode errors
    }
}

function restoreViewState(spreadSheet: Spreadsheet, saved: ExcelViewState) {
    const sheets = spreadSheet.getData();
    if (!sheets.length) return;
    const sheetIndex = Math.min(Math.max(0, saved.sheetIndex), sheets.length - 1);
    const sheet = sheets[sheetIndex];
    const maxRi = Math.max(0, (sheet.rows?.len ?? 1) - 1);
    const maxCi = Math.max(0, (sheet.cols?.len ?? 1) - 1);
    const ri = Math.min(Math.max(0, saved.ri), maxRi);
    const ci = Math.min(Math.max(0, saved.ci), maxCi);
    spreadSheet.scrollToCell(ri, ci, sheetIndex);
}

function ExcelViewer() {
    const { message, modal } = App.useApp();
    const [loading, setLoading] = useState(true)
    const [dark, setDark] = useState(loadDarkMode)
    const [readOnly, setReadOnly] = useState(false)
    const [findPanel, setFindPanel] = useState<'find' | 'replace' | null>(null)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [saveAsVisible, setSaveAsVisible] = useState(false)
    const [saveAsFormat, setSaveAsFormat] = useState('xlsx')
    const [parquetMode, setParquetMode] = useState(false)
    const [parquetLoading, setParquetLoading] = useState(false)
    const [parquetPage, setParquetPage] = useState<ParquetPageState | null>(null)
    const [parquetPageInput, setParquetPageInput] = useState('1')
    const extRef = useRef('')
    const documentCacheIdRef = useRef('')
    const readOnlyRef = useRef(false)
    const parquetModeRef = useRef(false)
    const parquetRequestIdRef = useRef(0)
    const requestParquetPageRef = useRef<(pageIndex: number, pageSize?: number) => void>(() => { })
    const spreadSheetRef = useRef<Spreadsheet | null>(null)
    const csvEncodingRef = useRef<'utf8' | 'gbk'>('utf8')
    const csvDelimiterRef = useRef(',')
    const initialFormattingRef = useRef('')

    useEffect(() => {
        document.body.classList.toggle('office-dark', dark)
    }, [dark])

    const toggleDark = () => {
        setDark(prev => {
            const next = !prev
            applyDarkMode(next)
            return next
        })
    }

    useEffect(() => {
        spreadSheetRef.current?.reRender()
    }, [dark])

    const handleSaveAs = useCallback(() => {
        if (parquetModeRef.current) return;
        setSaveAsVisible(true);
    }, []);

    const handleSave = useCallback(async () => {
        if (parquetModeRef.current) return;
        const spreadSheet = spreadSheetRef.current;
        if (!spreadSheet) return;
        if (readOnlyRef.current) {
            await handleSaveAs();
            return;
        }

        const ext = extRef.current.replace(/^\./, '').toLowerCase();
        const sheets = spreadSheet.getData();
        const csvEncoding = csvEncodingRef.current;
        const csvDelimiter = csvDelimiterRef.current;

        if (ext !== 'xlsx' && ext !== 'xlsm' && hasFormattingChanged(initialFormattingRef.current, sheets)) {
            await new Promise<void>((resolve) => {
                const dialog = modal.confirm({
                    title: t('viewer.formatCannotPreserveTitle'),
                    content: t('viewer.formatCannotPreserveContent', ext.toUpperCase()),
                    okText: t('viewer.saveAsXlsx'),
                    cancelText: t('button.cancel'),
                    centered: true,
                    getContainer: () => document.body,
                    onOk: async () => {
                        try {
                            await export_xlsx(spreadSheet, 'xlsx', csvEncoding, { saveAs: true }, csvDelimiter);
                        } catch (error) {
                            console.error(`Failed to save Excel file: ${(error as Error).message}`);
                            throw error;
                        }
                    },
                    onCancel: () => { },
                    footer: (_, { OkBtn, CancelBtn }) => (
                        <>
                            <CancelBtn />
                            <Button
                                onClick={() => {
                                    void (async () => {
                                        dialog.destroy();
                                        try {
                                            await export_xlsx(spreadSheet, extRef.current, csvEncoding, undefined, csvDelimiter);
                                        } catch (error) {
                                            console.error(`Failed to save Excel file: ${(error as Error).message}`);
                                        }
                                    })();
                                }}
                            >
                                {t('viewer.saveAsOriginal')}
                            </Button>
                            <OkBtn />
                        </>
                    ),
                    afterClose: () => resolve(),
                });
            });
            return;
        }

        try {
            await export_xlsx(spreadSheet, extRef.current, csvEncoding, undefined, csvDelimiter);
            spreadSheet.setSaveEnabled(false);
        } catch (error) {
            console.error(`Failed to save Excel file: ${(error as Error).message}`);
        }
    }, [modal, handleSaveAs]);

    const confirmSaveAs = useCallback(async (fmt: string) => {
        if (parquetModeRef.current) return;
        const spreadSheet = spreadSheetRef.current;
        if (!spreadSheet) return;
        setSaveAsVisible(false);
        try {
            await exportSaveAs(spreadSheet, fmt, csvEncodingRef.current, csvDelimiterRef.current);
            if (!readOnlyRef.current) {
                spreadSheet.setSaveEnabled(false);
            }
        } catch (error) {
            console.error(`Failed to save Excel file: ${(error as Error).message}`);
        }
    }, []);

    const requestParquetPage = useCallback((pageIndex: number, pageSize?: number) => {
        const requestId = parquetRequestIdRef.current + 1;
        parquetRequestIdRef.current = requestId;
        setParquetLoading(true);
        setLoading(true);
        setLoadError(null);
        handler.emit('parquetLoadPage', {
            requestId,
            pageIndex,
            pageSize: pageSize ?? parquetPage?.pageSize ?? DEFAULT_PARQUET_PAGE_SIZE,
        });
    }, [parquetPage?.pageSize]);
    requestParquetPageRef.current = requestParquetPage;

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') {
                e.preventDefault();
                if (parquetModeRef.current) {
                    return;
                }
                if (readOnlyRef.current) {
                    void handleSaveAs();
                } else {
                    void handleSave();
                }
                return;
            }
            if ((e.ctrlKey || e.metaKey) && e.code === 'KeyF') {
                e.preventDefault();
                setFindPanel('find');
                return;
            }
            if ((e.ctrlKey || e.metaKey) && e.code === 'KeyH') {
                e.preventDefault();
                setFindPanel(readOnlyRef.current ? 'find' : 'replace');
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [handleSave, handleSaveAs]);

    useEffect(() => {
        const container = document.getElementById('container');
        if (!container) {
            setLoadError('Spreadsheet container not found');
            setLoading(false);
            return;
        }

        const createSpreadsheet = (
            sheets: any[],
            maxLength: number,
            maxCols: number,
            fileReadOnly: boolean,
            allowSaveAs = true,
            restoreState = true,
        ) => {
            const viewRowLen = Math.max(maxLength ?? 0, MIN_VIEW_ROWS);
            const viewColLen = Math.max(maxCols ?? 0, MIN_VIEW_COLS);
            container.innerHTML = '';
            const spreadSheet = new Spreadsheet(container, {
                mode: fileReadOnly ? 'read' : 'edit',
                showToolbar: true,
                allowSaveAs,
                row: { len: viewRowLen, height: 30 },
                col: { len: viewColLen },
                view: { height: () => window.innerHeight - 2 },
            });
            spreadSheetRef.current = spreadSheet;
            setLoading(false);
            spreadSheet.loadData(sheets);
            if (!fileReadOnly) {
                spreadSheet.on('save', () => void handleSave());
            }
            if (allowSaveAs) {
                spreadSheet.on('save-as', () => { void handleSaveAs(); });
            }
            spreadSheet.on('find', () => { setFindPanel('find'); });
            const persistView = () => {
                saveViewState(documentCacheIdRef.current, spreadSheet.getSelection());
            };
            spreadSheet.on('cell-selected', () => { persistView(); });
            spreadSheet.onSheetChange(() => { persistView(); });
            spreadSheet.onOpenLink((linkPayload) => {
                const parsed = parseSpreadsheetLink(linkPayload.link);
                if (parsed.type === 'internal') {
                    spreadSheet.followHyperlink(linkPayload);
                } else {
                    handler.emit('openExternal', parsed.url);
                }
            });
            spreadSheet.onProtectedCellDblClick(() => {
                message.info({ duration: 2, content: t('viewer.protectedCell'), className: 'excel-protected-cell-message' });
            });
            spreadSheet.onValidationError((errMessage) => {
                message.warning({ duration: 2, content: errMessage, className: 'excel-validation-error-message' });
            });
            spreadSheet.on('change', () => {
                if (!fileReadOnly) {
                    spreadSheet.setSaveEnabled(true);
                    handler.emit('change');
                }
            });
            const savedView = restoreState ? loadViewState(documentCacheIdRef.current) : null;
            if (savedView) {
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => { restoreViewState(spreadSheet, savedView); });
                });
            }
            initialFormattingRef.current = buildFormattingSnapshot(spreadSheet.getData());
        };

        const initSpreadsheet = async (buffer: ArrayBuffer, payload: any) => {
            const fileReadOnly = payload.readOnly === true;
            if (payload.ext?.match(/csv/i)) {
                csvEncodingRef.current = detectCsvEncoding(buffer);
            }
            const { sheets, maxLength, maxCols, csvDelimiter } = await loadSheets(buffer, payload.ext);
            if (csvDelimiter) {
                csvDelimiterRef.current = csvDelimiter;
            }
            createSpreadsheet(sheets, maxLength ?? 0, maxCols ?? 0, fileReadOnly);
        };

        const loadParquetPage = (payload: any) => {
            const pageSheet = payload.sheet;
            const schemaSheet = payload.schemaSheet;
            const sheets = schemaSheet ? [pageSheet, schemaSheet] : [pageSheet];
            const maxLength = Math.max(pageSheet?.rows?.len ?? 0, schemaSheet?.rows?.len ?? 0);
            const maxCols = Math.max(pageSheet?.cols?.len ?? 0, schemaSheet?.cols?.len ?? 0);
            if (!spreadSheetRef.current || !parquetModeRef.current) {
                createSpreadsheet(sheets, maxLength, maxCols, true, false, false);
            } else {
                spreadSheetRef.current.loadData(sheets);
                setLoading(false);
            }
            initialFormattingRef.current = '';
            setParquetPage({
                pageIndex: payload.pageIndex,
                pageSize: payload.pageSize,
                totalRows: payload.totalRows,
                totalPages: payload.totalPages,
            });
            setParquetPageInput(String((payload.pageIndex ?? 0) + 1));
            setParquetLoading(false);
        };

        handler.on("open", (payload) => {
            extRef.current = payload.ext ?? '';
            documentCacheIdRef.current = payload.documentCacheId ?? '';
            const isParquet = payload.parquet === true || String(payload.ext ?? '').toLowerCase() === '.parquet';
            parquetModeRef.current = isParquet;
            setParquetMode(isParquet);
            setLoadError(null);
            setFindPanel(null);
            setParquetPage(null);
            setParquetPageInput('1');
            setParquetLoading(false);
            setLoading(true);
            if (isParquet) {
                readOnlyRef.current = true;
                setReadOnly(true);
                spreadSheetRef.current = null;
                if (container) {
                    container.innerHTML = '';
                }
                requestParquetPageRef.current(0, payload.pageSize ?? DEFAULT_PARQUET_PAGE_SIZE);
                return;
            }
            const fileReadOnly = payload.readOnly === true;
            readOnlyRef.current = fileReadOnly;
            setReadOnly(fileReadOnly);
            loadOfficeBuffer(payload).then(async (buffer) => {
                try {
                    await initSpreadsheet(buffer, payload);
                } catch (e) {
                    const msg = (e as Error).message || String(e);
                    console.error(`Failed to load Excel file: ${msg}`, e);
                    setLoadError(msg);
                    setLoading(false);
                }
            }).catch(error => {
                const msg = (error as Error).message || String(error);
                console.error(`Failed to load Excel file: ${msg}`, error);
                setLoadError(msg);
                setLoading(false);
            });
        }).on("parquetPageLoaded", (payload) => {
            if (payload.requestId !== parquetRequestIdRef.current) return;
            try {
                loadParquetPage(payload);
            } catch (error) {
                const msg = (error as Error).message || String(error);
                console.error(`Failed to render Parquet page: ${msg}`, error);
                setLoadError(msg);
                setParquetLoading(false);
                setLoading(false);
            }
        }).on("parquetLoadError", (payload) => {
            if (payload.requestId !== parquetRequestIdRef.current) return;
            setLoadError(payload.message || 'Failed to load Parquet file');
            setParquetLoading(false);
            setLoading(false);
        }).on("saveDone", () => {
        }).emit("init")

        let themeTimer: ReturnType<typeof setTimeout>;
        const themeObserver = new MutationObserver(() => {
            clearTimeout(themeTimer);
            themeTimer = setTimeout(() => spreadSheetRef.current?.reRender(), 120);
        });
        themeObserver.observe(document.head, { childList: true, subtree: true });

        return () => {
            themeObserver.disconnect();
            clearTimeout(themeTimer);
        };
    }, [message, handleSave, handleSaveAs])

    const commitParquetPageInput = () => {
        if (!parquetPage) return;
        const pageNumber = Number(parquetPageInput);
        if (!Number.isFinite(pageNumber)) {
            setParquetPageInput(String(parquetPage.pageIndex + 1));
            return;
        }
        const nextPageIndex = Math.min(Math.max(0, Math.floor(pageNumber) - 1), parquetPage.totalPages - 1);
        setParquetPageInput(String(nextPageIndex + 1));
        if (nextPageIndex !== parquetPage.pageIndex) {
            requestParquetPage(nextPageIndex, parquetPage.pageSize);
        }
    };

    return (
        <div className={`excel-viewer${parquetMode ? ' parquet-mode' : ''}`}>
            <Spin spinning={loading} fullscreen={true} />
            {loadError && !loading && (
                <div className="excel-load-error">
                    <div className="excel-load-error-panel">
                        <svg className="excel-load-error-icon" width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden>
                            <circle cx="22" cy="22" r="20" stroke="currentColor" strokeWidth="1.8" />
                            <path d="M22 13v12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                            <circle cx="22" cy="31" r="1.8" fill="currentColor" />
                        </svg>
                        <h2 className="excel-load-error-title">Failed to open file</h2>
                        <span className="excel-load-error-message">{loadError}</span>
                    </div>
                </div>
            )}
            {findPanel && !loading && !loadError && (
                <FindReplacePanel
                    spreadSheet={spreadSheetRef.current}
                    mode={findPanel}
                    onClose={() => setFindPanel(null)}
                    readOnly={readOnly}
                    onChanged={() => {
                        if (!readOnlyRef.current) {
                            spreadSheetRef.current?.setSaveEnabled(true);
                        }
                    }}
                />
            )}
            <Modal
                open={saveAsVisible}
                title={t('button.saveAs')}
                onCancel={() => setSaveAsVisible(false)}
                footer={[
                    <Button key="cancel" onClick={() => setSaveAsVisible(false)}>
                        {t('button.cancel')}
                    </Button>,
                    <Button key="ok" type="primary" onClick={() => void confirmSaveAs(saveAsFormat)}>
                        {t('button.save')}
                    </Button>,
                ]}
                getContainer={() => document.body}
                centered
                width={360}
            >
                <div style={{ padding: '8px 0 16px' }}>
                    <div style={{ marginBottom: 12, opacity: 0.65, fontSize: 12 }}>
                        {t('viewer.chooseExportFormat')}
                    </div>
                    <Radio.Group
                        value={saveAsFormat}
                        onChange={e => setSaveAsFormat(e.target.value as string)}
                        style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
                    >
                        {[
                            { value: 'xlsx', label: t('viewer.exportXlsxLabel'), desc: t('viewer.exportXlsxDesc') },
                            { value: 'csv', label: t('viewer.exportCsvLabel'), desc: t('viewer.exportCsvDesc') },
                            { value: 'xls', label: t('viewer.exportXlsLabel'), desc: t('viewer.exportXlsDesc') },
                            { value: 'ods', label: t('viewer.exportOdsLabel'), desc: t('viewer.exportOdsDesc') },
                        ].map(f => (
                            <Radio key={f.value} value={f.value} style={{ alignItems: 'flex-start' }}>
                                <span style={{ fontWeight: 500 }}>{f.label}</span>
                                <span style={{ display: 'block', fontSize: 11, opacity: 0.55, marginTop: 1 }}>{f.desc}</span>
                            </Radio>
                        ))}
                    </Radio.Group>
                </div>
            </Modal>
            <div id='container'></div>
            <div className="excel-footer-actions">
                {parquetMode && parquetPage && !loadError && (
                    <div className="parquet-pagination" aria-label={t('viewer.parquetPagination')}>
                        <span className="parquet-readonly-status">
                            Parquet · {t('viewer.readonlyBanner')}
                        </span>
                        <Button
                            size="small"
                            title={t('viewer.parquetPreviousPage')}
                            icon={<LeftOutlined />}
                            disabled={parquetLoading || parquetPage.pageIndex <= 0}
                            onClick={() => requestParquetPage(parquetPage.pageIndex - 1, parquetPage.pageSize)}
                        />
                        <span className="parquet-pagination-label">{t('viewer.parquetPage')}</span>
                        <input
                            className="parquet-page-input"
                            value={parquetPageInput}
                            disabled={parquetLoading}
                            inputMode="numeric"
                            onChange={event => setParquetPageInput(event.target.value)}
                            onBlur={commitParquetPageInput}
                            onKeyDown={event => {
                                if (event.key === 'Enter') {
                                    event.currentTarget.blur();
                                }
                            }}
                        />
                        <span className="parquet-pagination-total">/ {parquetPage.totalPages}</span>
                        <Button
                            size="small"
                            title={t('viewer.parquetNextPage')}
                            icon={<RightOutlined />}
                            disabled={parquetLoading || parquetPage.pageIndex >= parquetPage.totalPages - 1}
                            onClick={() => requestParquetPage(parquetPage.pageIndex + 1, parquetPage.pageSize)}
                        />
                        <select
                            className="parquet-page-size"
                            value={parquetPage.pageSize}
                            disabled={parquetLoading}
                            title={t('viewer.parquetRowsPerPage')}
                            onChange={event => requestParquetPage(0, Number(event.target.value))}
                        >
                            {PARQUET_PAGE_SIZE_OPTIONS.map(size => (
                                <option key={size} value={size}>{size.toLocaleString()}</option>
                            ))}
                        </select>
                        <span className="parquet-pagination-rows">
                            {t('viewer.parquetRows', parquetPage.totalRows.toLocaleString())}
                        </span>
                    </div>
                )}
                {readOnly && !parquetMode && !loading && !loadError && (
                    <span className="excel-readonly-status">
                        {t('viewer.readonlyBanner')}
                    </span>
                )}
                <button
                    type="button"
                    className="dark-mode-toggle"
                    title={dark ? t('viewer.switchToLightMode') : t('viewer.switchToDarkMode')}
                    onClick={toggleDark}
                >
                    {dark ? <SunOutlined /> : <MoonOutlined />}
                </button>
                {!loading && <SponsorBar placement="right" />}
            </div>
        </div>
    )
}

export default function Excel() {
    return (
        <App className="excel-app" message={{ top: 16 }}>
            <ExcelViewer />
        </App>
    );
}
