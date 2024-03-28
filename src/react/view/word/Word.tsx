import { Pagination, Spin } from "antd";
import * as docx from 'docx-preview';
import { useEffect, useRef, useState } from "react";
import { handler } from "../../util/vscode";
import './Word.css';

export default function Word() {
    const content = useRef(null), container = useRef(null)
    const [loading, setLoading] = useState(true)
    const [pageInfo, setPageInfo] = useState({ current: 1, total: 0, pageSize: null })

    function updatePageInfo() {
        const pageSize = window.innerHeight - 85;
        const current = ((container.current.scrollTop / pageSize) | 0) + 1;
        const total = ((content.current.scrollHeight / pageSize) | 0) + 1;
        setPageInfo({ current, total, pageSize })
    }

    useEffect(() => {
        handler.on("open", ({ path }) => {
            setLoading(true)
            fetch(path).then(response => response.arrayBuffer()).then(res => {
                content.current = document.getElementById('content')
                container.current = document.getElementById('container')
                docx.renderAsync(res, content.current, null, {}).then(() => {
                    updatePageInfo()
                    window.addEventListener('resize', () => updatePageInfo())
                    container.current.addEventListener('wheel', () => {
                        updatePageInfo()
                    })
                }).finally(() => {
                    setLoading(false)
                });
            }).catch(() => {
                setLoading(false)
            })
        }).emit('init')
    }, [])

    function onChange(page: number) {
        container.current.scrollTo(0, pageInfo.pageSize * (page - 1));
        setPageInfo({ ...pageInfo, current: page })
    }
    return (
        <>
            <Spin spinning={loading} fullscreen={true}>
            </Spin>
            <div id="container">
                <div id="content" style={{ width: '100%' }}>
                </div>
            </div>
            <Pagination
                onChange={onChange} style={{ marginTop: '10px', textAlign: 'center' }}
                current={pageInfo.current} total={pageInfo.total} defaultPageSize={1}
                showQuickJumper showSizeChanger={false}
            />
        </>
    )
}