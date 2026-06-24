import { MoonOutlined, SunOutlined } from "@ant-design/icons";
import { App, Button, Spin } from "antd";
import { useCallback, useEffect, useRef, useState } from "react";
import { handler, loadDarkMode, applyDarkMode } from "../../util/vscode.ts";
import { getConfigs } from "../../util/vscodeConfig.ts";
import { loadOfficeBuffer } from "../../util/loadOfficeContent.ts";
import SponsorBar from '../components/SponsorBar';
import './Excel.less';
import { detectCsvEncoding } from "./csvEncoding.ts";
import { loadSheets } from "./excel_reader.ts";
import { export_xlsx, buildFormattingSnapshot, hasFormattingChanged } from "./excel_writer.ts";
import Spreadsheet from './x-spreadsheet/index';

function ExcelViewer() {
    const { message, modal } = App.useApp();
    const [loading, setLoading] = useState(true)
    const [dark, setDark] = useState(loadDarkMode)
    const extRef = useRef('')
    const spreadSheetRef = useRef<Spreadsheet | null>(null)
    const csvEncodingRef = useRef<'utf8' | 'gbk'>('utf8')
    const initialFormattingRef = useRef('')
    const isZh = getConfigs()?.language?.startsWith('zh');
    const saveSuccessText = isZh ? '保存成功' : 'Save done';

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

    const handleSave = useCallback(async () => {
        const spreadSheet = spreadSheetRef.current;
        if (!spreadSheet) return;

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
    }, [isZh, modal]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') {
                e.preventDefault();
                void handleSave();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [handleSave]);

    useEffect(() => {
        const container = document.getElementById('container');

        handler.on("open", (payload) => {
            extRef.current = payload.ext ?? '';
            const startTime = Date.now();
            console.log('Loading Excel file...');
            loadOfficeBuffer(payload).then(async (res) => {
                if (payload.ext?.match(/csv/i)) {
                    csvEncodingRef.current = detectCsvEncoding(res);
                }
                const { sheets, maxLength, maxCols } = await loadSheets(res, payload.ext);
                const ext = (payload.ext ?? '').replace(/^\./, '').toLowerCase();
                container.innerHTML = ''
                const spreadSheet = new Spreadsheet(container, {
                    showToolbar: true,
                    headerRowStyle: ext !== 'xlsx' && ext !== 'xlsm',
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
                spreadSheet.on('save', () => void handleSave());
                initialFormattingRef.current = buildFormattingSnapshot(spreadSheet.getData());
                const endTime = Date.now();
                console.log(`Excel file loaded successfully. Time elapsed: ${endTime - startTime}ms`);
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
    }, [message, saveSuccessText])

    return (
        <div className='excel-viewer'>
            <Spin spinning={loading} fullscreen={true} />
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
