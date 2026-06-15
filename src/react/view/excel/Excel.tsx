import { MoonOutlined, SunOutlined } from "@ant-design/icons";
import { App, Spin } from "antd";
import { useEffect, useRef, useState } from "react";
import { handler, loadDarkMode, applyDarkMode } from "../../util/vscode.ts";
import { useWindowSize } from "../../util/reactUtils.ts";
import { getConfigs } from "../../util/vscodeConfig.ts";
import VSCodeLogo from "../vscode.tsx";
import SponsorBar from '../components/SponsorBar';
import './Excel.less';
import { loadSheets } from "./excel_reader.ts";
import { export_xlsx } from "./excel_writer.ts";
import Spreadsheet from './x-spreadsheet/index';

function ExcelViewer() {
    const { message } = App.useApp();
    const [loading, setLoading] = useState(true)
    const [dark, setDark] = useState(loadDarkMode)
    const isCSV = useRef<boolean>(false)
    const extRef = useRef('')
    const spreadSheetRef = useRef<Spreadsheet | null>(null)
    const [width] = useWindowSize()
    const showSponsor = width >= 600
    const saveSuccessText = getConfigs()?.language?.startsWith('zh') ? '保存成功' : 'Save done';

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

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') {
                e.preventDefault();
                if (spreadSheetRef.current) {
                    export_xlsx(spreadSheetRef.current, extRef.current);
                }
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    useEffect(() => {
        const container = document.getElementById('container');

        handler.on("open", ({ path, ext }) => {
            extRef.current = ext ?? '';
            const startTime = Date.now();
            console.log('Loading Excel file...');
            fetch(path).then(response => response.arrayBuffer()).then(async (res) => {
                const { sheets, maxLength, maxCols } = await loadSheets(res, ext);
                isCSV.current = ext?.match(/csv/i) !== null;
                container.innerHTML = ''
                const spreadSheet = new Spreadsheet(container, {
                    showToolbar: false,
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
            <button
                type="button"
                className="dark-mode-toggle"
                title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
                onClick={toggleDark}
            >
                {dark ? <SunOutlined /> : <MoonOutlined />}
            </button>
            {
                isCSV.current ? <VSCodeLogo /> : null
            }
            {showSponsor ? <SponsorBar placement="right" /> : null}
        </div>
    )
}

export default function Excel() {
    return (
        <App>
            <ExcelViewer />
        </App>
    );
}
