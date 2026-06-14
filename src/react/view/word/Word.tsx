import { MoonOutlined, SunOutlined } from "@ant-design/icons";
import { Alert, Pagination, Spin } from "antd";
import * as docx from 'docx-preview';
import { useCallback, useEffect, useRef, useState } from "react";
import { handler, loadDarkMode, applyDarkMode } from "../../util/vscode";
import SponsorBar from '../components/SponsorBar';
import './Word.css';

const DOCX_RENDER_OPTIONS: Partial<docx.Options> = {
    breakPages: true,
    renderHeaders: true,
    renderFooters: true,
    renderFootnotes: true,
    renderEndnotes: true,
};

export default function Word() {
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dark, setDark] = useState(loadDarkMode);
    const [pageInfo, setPageInfo] = useState({ current: 1, total: 0, pageSize: null as number | null });

    useEffect(() => {
        document.body.classList.toggle('office-dark', dark);
    }, [dark]);

    const toggleDark = () => {
        setDark(prev => {
            const next = !prev;
            applyDarkMode(next);
            return next;
        });
    };

    const updatePageInfo = useCallback(() => {
        const container = containerRef.current;
        const content = contentRef.current;
        if (!container || !content) {
            return;
        }
        const pageSize = window.innerHeight - 85;
        const current = ((container.scrollTop / pageSize) | 0) + 1;
        const total = ((content.scrollHeight / pageSize) | 0) + 1;
        setPageInfo({ current, total, pageSize });
    }, []);

    const loadDocument = useCallback(async (path: string) => {
        const content = contentRef.current;
        const container = containerRef.current;
        if (!content || !container) {
            return;
        }

        setLoading(true);
        setError(null);
        content.innerHTML = '';
        container.scrollTo(0, 0);

        try {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`Failed to fetch document (${response.status})`);
            }
            const buffer = await response.arrayBuffer();
            await docx.renderAsync(buffer, content, null, DOCX_RENDER_OPTIONS);
            updatePageInfo();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load document');
        } finally {
            setLoading(false);
        }
    }, [updatePageInfo]);

    useEffect(() => {
        handler.on('open', ({ path }) => {
            loadDocument(path);
        }).emit('init');
    }, [loadDocument]);

    useEffect(() => {
        if (loading) {
            return;
        }
        const container = containerRef.current;
        if (!container) {
            return;
        }

        const onResize = () => updatePageInfo();
        const onWheel = () => updatePageInfo();
        window.addEventListener('resize', onResize);
        container.addEventListener('wheel', onWheel, { passive: true });
        return () => {
            window.removeEventListener('resize', onResize);
            container.removeEventListener('wheel', onWheel);
        };
    }, [loading, updatePageInfo]);

    function onChange(page: number) {
        const container = containerRef.current;
        if (!container) {
            return;
        }
        const pageSize = pageInfo.pageSize ?? window.innerHeight - 85;
        container.scrollTo(0, pageSize * (page - 1));
        setPageInfo({ ...pageInfo, current: page });
    }

    return (
        <div className="word-viewer">
            <button
                type="button"
                className="dark-mode-toggle"
                title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
                onClick={toggleDark}
            >
                {dark ? <SunOutlined /> : <MoonOutlined />}
            </button>
            <Spin spinning={loading} fullscreen />
            {error && <Alert type="error" message={error} showIcon style={{ margin: 16 }} />}
            <div className="word-body" ref={containerRef}>
                <div className="word-content" ref={contentRef} />
            </div>
            <div className="word-footer">
                <Pagination
                    className="word-pagination"
                    onChange={onChange}
                    current={pageInfo.current}
                    total={pageInfo.total}
                    defaultPageSize={1}
                    showQuickJumper
                    showSizeChanger={false}
                />
                <SponsorBar placement="right" />
            </div>
        </div>
    );
}
