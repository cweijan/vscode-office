import { message, Spin, Tabs } from "antd";
import { useEffect, useRef, useState } from "react";
import { handler } from "../../util/vscode.ts";
import './Excel.less';
import { loadSheets } from "./excel_reader.ts";
import Spreadsheet from './x-spreadsheet/index';
import { export_xlsx } from "./excel_writer.ts";
import VSCodeLogo from "../vscode.tsx";

export default function Excel() {
    const loading = useRef(true)
    const fileType = useRef<string>(null)
    const s2Ref = useRef<Spreadsheet>(null)
    const [sheets, setSheets] = useState<any[]>([])
    useEffect(() => {
        const container = document.getElementById('container');

        handler.on("open", ({ path, ext }) => {
            const startTime = Date.now();
            console.log('Loading Excel file...');
            fetch(path).then(response => response.arrayBuffer()).then(res => {
                const { sheets, maxLength, maxCols } = loadSheets(res, ext);
                fileType.current = ext;
                container.innerHTML = ''
                const spreadSheet = new Spreadsheet(container, {
                    showBottomBar: false,
                    showToolbar: !ext?.match(/csv/i),
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
            {
                fileType.current?.match(/csv/i) ? <VSCodeLogo /> : null
            }
        </div>
    )
}