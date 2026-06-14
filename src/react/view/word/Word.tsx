import { Pagination, Spin } from "antd";
import * as docx from 'docx-preview';
import { useEffect, useRef, useState } from "react";
import { handler } from "../../util/vscode";
import './Word.css';

export default function Word() {
    const content = useRef(null), container = useRef(null)
    const [loading, setLoading] = useState(true)
    const [dark, setDark] = useState(() => {
        try { return localStorage.getItem('office-dark-mode') === '1' } catch (e) { return false }
    })
    const [pageInfo, setPageInfo] = useState({ current: 1, total: 0, pageSize: null })

    useEffect(() => {
        document.body.classList.toggle('office-dark', dark)
        try { localStorage.setItem('office-dark-mode', dark ? '1' : '0') } catch (e) { }
    }, [dark])

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
            <button className="dark-mode-toggle" title="Toggle Dark Mode" onClick={() => setDark(d => !d)}>
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M6.2 1.4a6.6 6.6 0 1 0 8.4 8.4A5.2 5.2 0 0 1 6.2 1.4z" fill="currentColor" />
                </svg>
            </button>
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