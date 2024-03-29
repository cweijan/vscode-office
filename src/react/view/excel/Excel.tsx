import { S2DataConfig, TableSheet, setLang } from '@antv/s2';
import { Spin, Tabs } from "antd";
import { useEffect, useRef, useState } from "react";
import { handler } from "../../util/vscode.ts";
import './Excel.less';
import { S2ExcelTheme, s2Options } from './antvS2Options.ts';
import { loadSheets } from "./excel_reader.ts";
import VSCodeLogo from './vscode.tsx';

export default function Excel() {
    const loading = useRef(true)
    const fileType = useRef<string>(null)
    const s2Ref = useRef<TableSheet>(null)
    const [sheets, setSheets] = useState<S2DataConfig[]>([])
    useEffect(() => {
        const container = document.getElementById('container');
        const s2 = new TableSheet(container, { fields: { columns: [] }, data: [] }, {
            ...s2Options,
            width: window.innerWidth - 10,
            height: window.innerHeight - 50,
        });
        setLang('en_US')
        s2.setTheme(S2ExcelTheme);
        s2Ref.current = s2;
        window.onresize = () => {
            s2.changeSheetSize(window.innerWidth - 10, window.innerHeight - 50)
            s2.render(false)
        }
        handler.on("open", ({ path, ext }) => {
            console.log('Loading...')
            fetch(path).then(response => response.arrayBuffer()).then(res => {
                const sheets = loadSheets(res, ext);
                fileType.current = ext;
                s2.setDataCfg(sheets[0])
                s2.render()
                loading.current = false
                setSheets(sheets)
            })
        }).emit("init")
    }, [])

    function changeTab(activeKey: string): void {
        const sheet = sheets[parseInt(activeKey)]
        const s2 = s2Ref.current
        s2.setDataCfg(sheet)
        s2.render()
    }
    const items = sheets.map((sheet, index) => ({
        key: index.toString(),
        label: sheet.name as string,
    }))

    const ext = fileType.current;
    return (
        <div className='excel-viewer'>
            <Spin spinning={loading.current} fullscreen={true}>
            </Spin>
            <div id='container'></div>
            <Tabs items={items} onChange={changeTab} tabBarGutter={20}
                style={{ marginLeft: '30px' }}
            />
            {
                ext?.match(/csv/i) ? <VSCodeLogo onClick={() => handler.emit('editInVSCode', true)} /> : null
            }
        </div>
    )
}