import { LayoutWidthType, setLang } from '@antv/s2';
import { SheetComponent, SheetComponentOptions } from '@antv/s2-react';
import '@antv/s2-react/dist/style.min.css';
import { Spin } from "antd";
import { useEffect, useRef, useState } from "react";
import { handler } from "../util/vscode.ts";
import { readCSV, readXLSX } from "./excel/excel_reader.ts";

export default function ExcelViewer() {
    const sheetRef = useRef(null);
    const [loading, setLoading] = useState(true)
    const [s2DataConfig, setS2DataConfig] = useState({ fields: { columns: [] }, data: [] })
    const [s2Options, setS2Options] = useState<SheetComponentOptions>({
        width: window.innerWidth - 20,
        height: window.innerHeight - 20,
        tooltip: {
            operation: {
                hiddenColumns: false,
            },
            dataCell: {
                enable: false
            }
        },
        interaction: {
            resize: {
                rowCellVertical: false,
            },
        },
        style: {
            layoutWidthType: LayoutWidthType.Compact
        },
        seriesNumber: {
            enable: true,
            text: '',
        },
        placeholder: '',
    })
    function loadSheet(buffer, ext) {
        (async () => {
            let start = new Date().getTime();
            const ab = new Uint8Array(buffer).buffer
            var { sheets, maxCols } = ext.toLowerCase() == ".csv" ? readCSV(ab) : readXLSX(ab);
            if (import.meta.env.DEV) {
                console.log('Load time:', new Date().getTime() - start, 'ms');
            }
            setS2DataConfig({
                fields: {
                    columns: Array(maxCols).fill(0).map((_, i) => (String.fromCharCode(65 + i)))
                },
                data: sheets[0].rows,
            })
            setLoading(false)
        })();
    }

    useEffect(() => {
        setLang('en_US')
        window.onresize = () => {
            setS2Options({
                width: window.innerWidth - 20,
                height: window.innerHeight - 20,
            })
        }
        handler.on("open", ({ path, ext }) => {
            console.log('open')
            fetch(path).then(response => response.arrayBuffer()).then(res => loadSheet(res, ext))
        }).on("saveDone", () => {
            // notie.alert({ type: 1, text: 'Save Success!' })
        }).emit("init")
    }, [])
    return (
        <Spin spinning={loading}>
            <SheetComponent
                ref={sheetRef}
                dataCfg={s2DataConfig}
                options={s2Options}
                sheetType="table"
            />
        </Spin>
    )
}