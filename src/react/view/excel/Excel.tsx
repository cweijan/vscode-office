import { MoonOutlined, SunOutlined } from "@ant-design/icons";
import { message, Spin } from "antd";
import { useEffect, useRef, useState } from "react";
import { handler, loadDarkMode, applyDarkMode } from "../../util/vscode.ts";
import VSCodeLogo from "../vscode.tsx";
import './Excel.less';
import { loadSheets } from "./excel_reader.ts";
import { export_xlsx } from "./excel_writer.ts";
import Spreadsheet from './x-spreadsheet/index';

export default function Excel() {
    const [loading, setLoading] = useState(true)
    const [dark, setDark] = useState(loadDarkMode)
    const isCSV = useRef<boolean>(false)
    const spreadSheetRef = useRef<Spreadsheet | null>(null)

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
        const container = document.getElementById('container');

        handler.on("open", ({ path, ext }) => {
            const startTime = Date.now();
            console.log('Loading Excel file...');
            fetch(path).then(response => response.arrayBuffer()).then(async (res) => {
                const { sheets, maxLength, maxCols } = await loadSheets(res, ext);
                isCSV.current = ext?.match(/csv/i) !== null;
                container.innerHTML = ''
                const spreadSheet = new Spreadsheet(container, {
                    // showToolbar: !ext?.match(/csv/i),
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
                window.addEventListener('keydown', (e) => {
                    if ((e.ctrlKey || e.metaKey) && e.code == "KeyS") {
                        export_xlsx(spreadSheet, ext);
                    }
                });
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
                duration: 1,
                content: 'Save done',
            })
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
    }, [])

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
        </div>
    )
}