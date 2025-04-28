import { message, Spin, Tabs } from "antd";
import { useEffect, useRef, useState } from "react";
import { handler } from "../../util/vscode.ts";
import './Excel.less';
import { loadSheets } from "./excel_reader.ts";
import Spreadsheet from './x-spreadsheet/index';
import { export_xlsx } from "./excel_writer.ts";

export default function Excel() {
    const loading = useRef(true)
    const s2Ref = useRef<Spreadsheet>(null)
    const [sheets, setSheets] = useState<any[]>([])
    useEffect(() => {
        const container = document.getElementById('container');

        handler.on("open", ({ path, ext }) => {
            const startTime = Date.now();
            console.log('Loading Excel file...');
            fetch(path).then(response => response.arrayBuffer()).then(res => {
                const { sheets, maxLength, maxCols } = loadSheets(res, ext);
                container.innerHTML = ''
                const spreadSheet = new Spreadsheet(container, {
                    showBottomBar: false,
                    row: {
                        len: maxLength + 50,
                        height: 30,
                    },
                    col: {
                        len: maxCols,
                    },
                    view: {
                        height: () => window.innerHeight - 45,
                    }
                });
                window.addEventListener('keydown', (e) => {
                    if ((e.ctrlKey || e.metaKey) && e.code == "KeyS") {
                        export_xlsx(spreadSheet, ext);
                    }
                });
                const child = document.querySelector('.x-spreadsheet-toolbar-btns>div:nth-child(3)>.x-spreadsheet-icon') as HTMLElement;
                if (ext?.match(/csv/i)) {
                    child.innerHTML = '<svg height="18" viewBox="-11.9 -2 1003.9 995.6" width="18" xmlns="http://www.w3.org/2000/svg"><path d="m12.1 353.9s-24-17.3 4.8-40.4l67.1-60s19.2-20.2 39.5-2.6l619.2 468.8v224.8s-.3 35.3-45.6 31.4z" fill="#2489ca"/><path d="m171.7 498.8-159.6 145.1s-16.4 12.2 0 34l74.1 67.4s17.6 18.9 43.6-2.6l169.2-128.3z" fill="#1070b3"/><path d="m451.9 500 292.7-223.5-1.9-223.6s-12.5-48.8-54.2-23.4l-389.5 354.5z" fill="#0877b9"/><path d="m697.1 976.2c17 17.4 37.6 11.7 37.6 11.7l228.1-112.4c29.2-19.9 25.1-44.6 25.1-44.6v-671.2c0-29.5-30.2-39.7-30.2-39.7l-197.7-95.3c-43.2-26.7-71.5 4.8-71.5 4.8s36.4-26.2 54.2 23.4v887.5c0 6.1-1.3 12.1-3.9 17.5-5.2 10.5-16.5 20.3-43.6 16.2z" fill="#3c99d4"/></svg>'
                    child.parentElement.dataset.tooltip='Edit In VS Code'
                    child.onclick = e => {
                        handler.emit("editInVSCode", true)
                        e.stopPropagation();
                    }
                } else {
                    child.parentElement.style.display = 'none'
                }
                s2Ref.current = spreadSheet;
                loading.current = false;
                spreadSheet.loadData(sheets);
                setSheets(sheets);
                const endTime = Date.now();
                console.log(`Excel file loaded successfully. Time elapsed: ${endTime - startTime}ms`);
            }).catch(error => {
                console.error(`Failed to load Excel file: ${error.message}`);
                loading.current = false;
            });
        }).on("saveDone", () => {
            message.success({
                duration: 1,
                content: 'Save done',
            })
        }).emit("init")
    }, [])

    function changeTab(activeKey: string): void {
        const sheet = sheets[parseInt(activeKey)]
        const s2 = s2Ref.current
        s2.loadData(sheet)
    }
    const items = sheets.map((sheet, index) => ({
        key: index.toString(),
        label: sheet.name as string,
    }))

    return (
        <div className='excel-viewer'>
            <Spin spinning={loading.current} fullscreen={true}>
            </Spin>
            <div id='container'></div>
            <Tabs items={items} onChange={changeTab} tabBarGutter={20}
                style={{ marginLeft: '50px' }}
            />
        </div>
    )
}