import { MoonOutlined, SunOutlined } from "@ant-design/icons";
import { App, Button, Modal, Radio, Spin } from "antd";
import { useCallback, useEffect, useRef, useState } from "react";
import { handler, loadDarkMode, applyDarkMode } from "../../util/vscode.ts";
import { getConfigs } from "../../util/vscodeConfig.ts";
import { loadOfficeBuffer } from "../../util/loadOfficeContent.ts";
import SponsorBar from '../components/SponsorBar';
import './Excel.less';
import { detectCsvEncoding } from "./csvEncoding.ts";
import { loadSheets } from "./excel_reader.ts";
import { export_xlsx, exportSaveAs, buildFormattingSnapshot, hasFormattingChanged } from "./excel_writer.ts";
import Spreadsheet from './x-spreadsheet/index';
import FindReplacePanel from './FindReplacePanel';
import { parseSpreadsheetLink } from './excel_hyperlink';

type ExcelViewState = { ri: number; ci: number; sheetIndex: number };

const EXCEL_VIEW_STATE_SUFFIX = '-excel-view';

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
    const [saveAsVisible, setSaveAsVisible] = useState(false)
    const [saveAsFormat, setSaveAsFormat] = useState('xlsx')
    const extRef = useRef('')
    const documentCacheIdRef = useRef('')
    const readOnlyRef = useRef(false)
    const spreadSheetRef = useRef<Spreadsheet | null>(null)
    const csvEncodingRef = useRef<'utf8' | 'gbk'>('utf8')
    const initialFormattingRef = useRef('')
    const isZh = getConfigs()?.language?.startsWith('zh');
    const saveSuccessText = isZh ? '保存成功' : 'Save done';
    const protectedCellText = isZh ? '被保护单元格不支持此功能' : 'Protected cells do not support this function';

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
        setSaveAsVisible(true);
    }, []);

    const confirmSaveAs = useCallback(async (fmt: string) => {
        const spreadSheet = spreadSheetRef.current;
        if (!spreadSheet) return;
        setSaveAsVisible(false);
        try {
            await exportSaveAs(spreadSheet, fmt, csvEncodingRef.current);
            if (!readOnlyRef.current) {
                spreadSheet.setSaveEnabled(false);
            }
        } catch (error) {
            console.error(`Failed to save Excel file: ${(error as Error).message}`);
        }
    }, []);

    const handleSave = useCallback(async () => {
        const spreadSheet = spreadSheetRef.current;
        if (!spreadSheet) return;
        if (readOnlyRef.current) {
            await handleSaveAs();
            return;
        }

        const ext = extRef.current.replace(/^\./, '').toLowerCase();
        const sheets = spreadSheet.getData();
        const csvEncoding = csvEncodingRef.current;

        if (ext !== 'xlsx' && ext !== 'xlsm' && hasFormattingChanged(initialFormattingRef.current, sheets)) {
            await new Promise<void>((resolve) => {
                const dialog = modal.confirm({
                    title: isZh ? '格式将无法保存' : 'Formatting cannot be preserved',
                    content: isZh
                        ? `${ext.toUpperCase()} 格式不支持保存样式、合并单元格、公式等富格式内容。是否另存为 xlsx？`
                        : `${ext.toUpperCase()} cannot preserve styles, merges, formulas, etc. Save as xlsx instead?`,
                    okText: isZh ? '另存为 xlsx' : 'Save as xlsx',
                    cancelText: isZh ? '取消' : 'Cancel',
                    centered: true,
                    getContainer: () => document.body,
                    onOk: async () => {
                        try {
                            await export_xlsx(spreadSheet, 'xlsx', csvEncoding, { saveAs: true });
                        } catch (error) {
                            console.error(`Failed to save Excel file: ${(error as Error).message}`);
                            throw error;
                        }
                    },
                    onCancel: () => {},
                    footer: (_, { OkBtn, CancelBtn }) => (
                        <>
                            <CancelBtn />
                            <Button
                                onClick={() => {
                                    void (async () => {
                                        dialog.destroy();
                                        try {
                                            await export_xlsx(spreadSheet, extRef.current, csvEncoding);
                                        } catch (error) {
                                            console.error(`Failed to save Excel file: ${(error as Error).message}`);
                                        }
                                    })();
                                }}
                            >
                                {isZh ? '仍保存原格式' : 'Save as original'}
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
            await export_xlsx(spreadSheet, extRef.current, csvEncoding);
            spreadSheet.setSaveEnabled(false);
        } catch (error) {
            console.error(`Failed to save Excel file: ${(error as Error).message}`);
        }
    }, [isZh, modal, handleSaveAs]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') {
                e.preventDefault();
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

        handler.on("open", (payload) => {
            extRef.current = payload.ext ?? '';
            documentCacheIdRef.current = payload.documentCacheId ?? '';
            const fileReadOnly = payload.readOnly === true;
            readOnlyRef.current = fileReadOnly;
            setReadOnly(fileReadOnly);
            loadOfficeBuffer(payload).then(async (res) => {
                if (payload.ext?.match(/csv/i)) {
                    csvEncodingRef.current = detectCsvEncoding(res);
                }
                const { sheets, maxLength, maxCols } = await loadSheets(res, payload.ext);
                container.innerHTML = ''
                const spreadSheet = new Spreadsheet(container, {
                    mode: fileReadOnly ? 'read' : 'edit',
                    showToolbar: true,
                    row: {
                        len: maxLength + 50,
                        height: 30,
                    },
                    col: {
                        len: maxCols,
                    },
                    view: {
                        height: () => window.innerHeight - 2,
                    }
                });
                spreadSheetRef.current = spreadSheet;
                setLoading(false)
                spreadSheet.loadData(sheets);
                if (!fileReadOnly) {
                    spreadSheet.on('save', () => void handleSave());
                }
                spreadSheet.on('save-as', () => { void handleSaveAs(); });
                const persistView = () => {
                    saveViewState(documentCacheIdRef.current, spreadSheet.getSelection());
                };
                spreadSheet.on('cell-selected', () => {
                    persistView();
                });
                spreadSheet.onSheetChange(() => {
                    persistView();
                });
                spreadSheet.onOpenLink((payload) => {
                    const parsed = parseSpreadsheetLink(payload.link);
                    if (parsed.type === 'internal') {
                        spreadSheet.followHyperlink(payload);
                    } else {
                        handler.emit('openExternal', parsed.url);
                    }
                });
                spreadSheet.onProtectedCellDblClick(() => {
                    message.info({
                        duration: 2,
                        content: protectedCellText,
                        className: 'excel-protected-cell-message',
                    });
                });
                spreadSheet.on('change', () => {
                    if (!fileReadOnly) {
                        spreadSheet.setSaveEnabled(true);
                    }
                });
                const savedView = loadViewState(documentCacheIdRef.current);
                if (savedView) {
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            restoreViewState(spreadSheet, savedView);
                        });
                    });
                }
                initialFormattingRef.current = buildFormattingSnapshot(spreadSheet.getData());
            }).catch(error => {
                console.error(`Failed to load Excel file: ${error.message}`);
                setLoading(false)
            });
        }).on("saveDone", () => {
            message.success({
                duration: 2,
                content: saveSuccessText,
            });
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
    }, [message, saveSuccessText, protectedCellText, handleSave, handleSaveAs])

    return (
        <div className='excel-viewer'>
            <Spin spinning={loading} fullscreen={true} />
            {readOnly && !loading && (
                <div className="excel-readonly-banner">
                    {isZh ? '只读模式 — 可浏览与查找，请使用「另存为」保存更改' : 'Read-only — browse and find; use Save As to save changes'}
                </div>
            )}
            {findPanel && !loading && (
                <FindReplacePanel
                    spreadSheet={spreadSheetRef.current}
                    mode={findPanel}
                    onClose={() => setFindPanel(null)}
                    isZh={!!isZh}
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
                title={isZh ? '另存为' : 'Save As'}
                onCancel={() => setSaveAsVisible(false)}
                footer={[
                    <Button key="cancel" onClick={() => setSaveAsVisible(false)}>
                        {isZh ? '取消' : 'Cancel'}
                    </Button>,
                    <Button key="ok" type="primary" onClick={() => void confirmSaveAs(saveAsFormat)}>
                        {isZh ? '保存' : 'Save'}
                    </Button>,
                ]}
                getContainer={() => document.body}
                centered
                width={360}
            >
                <div style={{ padding: '8px 0 16px' }}>
                    <div style={{ marginBottom: 12, opacity: 0.65, fontSize: 12 }}>
                        {isZh ? '选择导出格式' : 'Choose export format'}
                    </div>
                    <Radio.Group
                        value={saveAsFormat}
                        onChange={e => setSaveAsFormat(e.target.value as string)}
                        style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
                    >
                        {[
                            { value: 'xlsx', label: 'Excel Workbook (.xlsx)', desc: isZh ? '支持样式、公式、合并单元格' : 'Supports styles, formulas, merged cells' },
                            { value: 'csv',  label: 'CSV (.csv)',             desc: isZh ? '纯文本，仅首个工作表' : 'Plain text, first sheet only' },
                            { value: 'xls',  label: 'Excel 97-2003 (.xls)',   desc: isZh ? '旧版 Excel 格式' : 'Legacy Excel format' },
                            { value: 'ods',  label: 'OpenDocument (.ods)',     desc: isZh ? '兼容 LibreOffice / WPS' : 'Compatible with LibreOffice / WPS' },
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
                <button
                    type="button"
                    className="dark-mode-toggle"
                    title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
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
