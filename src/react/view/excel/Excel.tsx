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
    const isCSV = useRef<boolean>(false)
    useEffect(() => {
        const container = document.getElementById('container');

        handler.on("open", ({ path, ext }) => {
            const startTime = Date.now();
            console.log('Loading Excel file...');
            fetch(path).then(response => response.arrayBuffer()).then(res => {
                const { sheets, maxLength, maxCols } = loadSheets(res, ext);
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
            <div id='container'></div>
            {
                isCSV.current ? <VSCodeLogo /> : null
            }
        </div>
    )
}