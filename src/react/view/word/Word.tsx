import { LeftOutlined, MoonOutlined, RightOutlined, SunOutlined } from "@ant-design/icons";
import { Alert, Spin } from "antd";
import * as docx from 'docx-preview';
import { useCallback, useEffect, useRef, useState } from "react";
import { handler, loadDarkMode, applyDarkMode } from "../../util/vscode";
import { loadOfficeBuffer } from "../../util/loadOfficeContent";
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
    const [pageDraft, setPageDraft] = useState('1');

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

    const loadDocument = useCallback(async (payload: { path?: string; buffer?: number[]; error?: string }) => {
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
            const buffer = await loadOfficeBuffer(payload);
            await docx.renderAsync(buffer, content, null, DOCX_RENDER_OPTIONS);
            updatePageInfo();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load document');
        } finally {
            setLoading(false);
        }
    }, [updatePageInfo]);

    useEffect(() => {
        handler.on('open', (payload) => {
            loadDocument(payload);
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

    useEffect(() => {
        setPageDraft(String(pageInfo.current));
    }, [pageInfo.current]);

    function goToPage(page: number) {
        const container = containerRef.current;
        if (!container || pageInfo.total <= 0) {
            return;
        }
        const nextPage = Math.min(Math.max(page, 1), pageInfo.total);
        const pageSize = pageInfo.pageSize ?? window.innerHeight - 85;
        container.scrollTo(0, pageSize * (nextPage - 1));
        setPageInfo({ ...pageInfo, current: nextPage });
    }

    function commitPageJump() {
        const page = Number.parseInt(pageDraft, 10);
        if (!Number.isFinite(page) || page < 1) {
            setPageDraft(String(pageInfo.current));
            return;
        }
        goToPage(page);
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
                {pageInfo.total > 0 && (
                    <nav className="word-page-nav" aria-label="Document pages">
                        <button
                            type="button"
                            className="word-page-btn"
                            disabled={pageInfo.current <= 1}
                            onClick={() => goToPage(pageInfo.current - 1)}
                            aria-label="Previous page"
                        >
                            <LeftOutlined />
                        </button>
                        <label className="word-page-indicator">
                            <input
                                type="text"
                                inputMode="numeric"
                                className="word-page-input"
                                aria-label="Current page"
                                value={pageDraft}
                                onChange={e => setPageDraft(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        e.currentTarget.blur();
                                    }
                                }}
                                onBlur={commitPageJump}
                            />
                            <span className="word-page-total">/ {pageInfo.total}</span>
                        </label>
                        <button
                            type="button"
                            className="word-page-btn"
                            disabled={pageInfo.current >= pageInfo.total}
                            onClick={() => goToPage(pageInfo.current + 1)}
                            aria-label="Next page"
                        >
                            <RightOutlined />
                        </button>
                    </nav>
                )}
                <SponsorBar placement="right" />
            </div>
        </div>
    );
}
