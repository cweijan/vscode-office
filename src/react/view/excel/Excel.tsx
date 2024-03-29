import { TableSheet, setLang } from '@antv/s2';
import '@antv/s2-react/dist/style.min.css';
import { Spin } from "antd";
import { useEffect, useState } from "react";
import { handler } from "../../util/vscode.ts";
import { S2ExcelTheme, s2Options } from './antvS2Options.ts';
import { loadSheet } from "./excel_reader.ts";

export default function Excel() {
    const [loading, setLoading] = useState(true)
    useEffect(() => {
        const container = document.getElementById('container');
        const s2 = new TableSheet(container, { fields: { columns: [] }, data: [] }, {
            ...s2Options,
            width: window.innerWidth - 20,
            height: window.innerHeight - 20,
        });
        setLang('en_US')
        s2.setTheme(S2ExcelTheme);
        window.onresize = () => {
            s2.changeSheetSize(window.innerWidth - 20, window.innerHeight - 20)
            s2.render(false)
        }
        handler.on("open", ({ path, ext }) => {
            console.log('Loading...')
            fetch(path).then(response => response.arrayBuffer()).then(res => {
                const data = loadSheet(res, ext);
                s2.setDataCfg(data)
                s2.render()
                setLoading(false)
            })
        }).emit("init")
    }, [])
    return (
        <>
            <Spin spinning={loading} fullscreen={true}>
            </Spin>
            <div id='container'></div>
        </>
    )
}