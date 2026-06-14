import { message, Spin } from "antd";
import { useEffect, useRef, useState } from "react";
import { handler } from "../../util/vscode.ts";
import VSCodeLogo from "../vscode.tsx";
import './Excel.less';
import { loadSheets } from "./excel_reader.ts";
import { export_xlsx } from "./excel_writer.ts";
import Spreadsheet from './x-spreadsheet/index';

export default function Excel() {
    const [loading, setLoading] = useState(true)
    const [dark, setDark] = useState(() => {
        try { return localStorage.getItem('office-dark-mode') === '1' } catch (e) { return false }
    })
    const isCSV = useRef<boolean>(false)

    useEffect(() => {
        document.body.classList.toggle('office-dark', dark)
        try { localStorage.setItem('office-dark-mode', dark ? '1' : '0') } catch (e) { }
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
    }, [])

    return (
        <div className='excel-viewer'>
            <Spin spinning={loading} fullscreen={true}>
            </Spin>
            <button className="dark-mode-toggle" title="Toggle Dark Mode" onClick={() => setDark(d => !d)}>
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M6.2 1.4a6.6 6.6 0 1 0 8.4 8.4A5.2 5.2 0 0 1 6.2 1.4z" fill="currentColor" />
                </svg>
            </button>
            <div id='container'></div>
            {
                isCSV.current ? <VSCodeLogo /> : null
            }
        </div>
    )
}