import {
    InfoCircleOutlined,
    LeftOutlined,
    MenuOutlined,
    RightOutlined,
    SearchOutlined,
    SettingOutlined,
    UnorderedListOutlined,
} from '@ant-design/icons';
import { Spin } from 'antd';
import { Book, NavItem, Rendition } from 'epubjs';
import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { handler } from '../../util/vscode';
import {
    applyEpubTheme,
    bindReaderMetaKeyRelay,
    ensureLocations,
    EpubSettings,
    FONT_OPTIONS,
    FONT_SIZE_OPTIONS,
    getNavItem,
    LINE_SPACING_OPTIONS,
    loadEpubBook,
    loadEpubSettings,
    resetEpubSettings,
    saveEpubSetting,
    searchEpubBook,
    SearchHit,
    THEME_OPTIONS,
} from './epubConfig';
import './Epub.css';

type SidebarTab = 'toc' | 'search' | 'info' | 'settings';

const WHEEL_NAV_INTERVAL_MS = 320;

interface BookMeta {
    title: string;
    author: string;
    description: string;
    series?: string;
    seriesIndex?: string;
    coverUrl: string | null;
}

function TocItems({
    items,
    indent,
    activeHref,
    onSelect,
}: {
    items: NavItem[];
    indent: number;
    activeHref: string | null;
    onSelect: (href: string) => void;
}) {
    const prefix = '\u00A0'.repeat(indent * 4);
    return (
        <>
            {items.map(item => (
                <div key={item.href + item.label}>
                    <a
                        className={`item${activeHref === item.href ? ' active' : ''}`}
                        href="#"
                        onClick={e => {
                            e.preventDefault();
                            onSelect(item.href);
                        }}
                    >
                        {prefix}{item.label.trim()}
                    </a>
                    {item.subitems?.length ? (
                        <TocItems
                            items={item.subitems}
                            indent={indent + 1}
                            activeHref={activeHref}
                            onSelect={onSelect}
                        />
                    ) : null}
                </div>
            ))}
        </>
    );
}

export default function Epub() {
    const appRef = useRef<HTMLDivElement>(null);
    const readerRef = useRef<HTMLDivElement>(null);
    const bookRef = useRef<Book | null>(null);
    const renditionRef = useRef<Rendition | null>(null);
    const settingsRef = useRef<EpubSettings>(loadEpubSettings());
    const wheelNavLockRef = useRef(0);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarTab, setSidebarTab] = useState<SidebarTab>('toc');
    const [settings, setSettings] = useState<EpubSettings>(settingsRef.current);
    const [meta, setMeta] = useState<BookMeta | null>(null);
    const [toc, setToc] = useState<NavItem[]>([]);
    const [activeTocHref, setActiveTocHref] = useState<string | null>(null);
    const [locationCurrent, setLocationCurrent] = useState(0);
    const [locationTotal, setLocationTotal] = useState(0);
    const [locationDraft, setLocationDraft] = useState('');
    const [atStart, setAtStart] = useState(true);
    const [atEnd, setAtEnd] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searching, setSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<SearchHit[]>([]);
    const [bookReady, setBookReady] = useState(false);

    const destroyBook = useCallback(() => {
        renditionRef.current?.destroy();
        renditionRef.current = null;
        bookRef.current?.destroy();
        bookRef.current = null;
        if (readerRef.current) {
            readerRef.current.innerHTML = '';
        }
        setBookReady(false);
        setMeta(null);
        setToc([]);
        setActiveTocHref(null);
        setLocationCurrent(0);
        setLocationTotal(0);
        setLocationDraft('');
        setSearchResults([]);
        setSearchQuery('');
    }, []);

    const handleReaderWheel = useCallback((rendition: Rendition, e: WheelEvent) => {
        e.preventDefault();
        const now = Date.now();
        if (now - wheelNavLockRef.current < WHEEL_NAV_INTERVAL_MS) {
            return;
        }
        wheelNavLockRef.current = now;
        if (e.deltaY > 0) {
            rendition.next();
        } else if (e.deltaY < 0) {
            rendition.prev();
        }
    }, []);

    const bindWheel = useCallback((rendition: Rendition) => {
        rendition.hooks.content.register(contents => {
            applyEpubTheme(rendition, settingsRef.current, appRef.current);
            const doc = contents.document;
            if (doc) {
                bindReaderMetaKeyRelay(doc);
                doc.onwheel = (e: WheelEvent) => handleReaderWheel(rendition, e);
            }
        });
    }, [handleReaderWheel]);

    const onRelocated = useCallback((location: {
        start: { cfi: string; href: string; location?: number; percentage?: number };
        atStart?: boolean;
        atEnd?: boolean;
    }) => {
        const book = bookRef.current;
        const rendition = renditionRef.current;
        if (!book || !rendition) {
            return;
        }

        const navItem = getNavItem(book, location, false) || getNavItem(book, location, true);
        setActiveTocHref(navItem?.href ?? null);

        const current = location.start.location ?? 0;
        const total = book.locations.length();
        setLocationCurrent(current);
        setLocationTotal(total);
        setLocationDraft(String(current));

        setAtStart(!!location.atStart);
        setAtEnd(!!location.atEnd);
        localStorage.setItem(`${book.key()}:pos`, location.start.cfi);
    }, []);

    const updateSetting = useCallback((key: keyof EpubSettings, value: string) => {
        setSettings(prev => {
            const next = { ...prev, [key]: value };
            settingsRef.current = next;
            saveEpubSetting(key, value);
            const rendition = renditionRef.current;
            if (rendition) {
                applyEpubTheme(rendition, next, appRef.current);
            }
            return next;
        });
    }, []);

    const resetAllSettings = useCallback(() => {
        const next = resetEpubSettings();
        settingsRef.current = next;
        setSettings({ ...next });
        const rendition = renditionRef.current;
        if (!rendition) {
            return;
        }
        applyEpubTheme(rendition, next, appRef.current);
        const location = rendition.location;
        if (location?.start) {
            onRelocated(location);
        }
        const cfi = location?.start?.cfi;
        if (cfi) {
            rendition.display(cfi).catch(() => undefined);
        }
    }, [onRelocated]);

    const bindRendition = useCallback((rendition: Rendition) => {
        bindWheel(rendition);
        rendition.on('relocated', onRelocated);
        rendition.on('keyup', (event: KeyboardEvent) => {
            if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                rendition.prev();
            } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                rendition.next();
            }
        });
        rendition.on('click', (event: MouseEvent) => {
            try {
                const target = event.target as HTMLElement;
                if (target.tagName.toLowerCase() === 'a') {
                    return;
                }
                if (target.parentElement?.tagName.toLowerCase() === 'a') {
                    return;
                }
                const manager = rendition.manager as { container?: HTMLElement; getContents?: () => { window: Window }[] };
                const container = manager.container;
                if (!container) {
                    return;
                }
                const third = container.clientWidth / 3;
                const x = event.pageX - container.scrollLeft;
                if (x > container.clientWidth - 20) {
                    event.preventDefault();
                    setSidebarOpen(true);
                }
            } catch {
                // ignore click routing errors
            }
        });
        rendition.on('displayError', (_err: Error) => {
            setError('Failed to render EPUB page');
        });
    }, [bindWheel, onRelocated]);

    const loadDocument = useCallback(async (path: string) => {
        const host = readerRef.current;
        if (!host) {
            return;
        }

        setLoading(true);
        setError(null);
        destroyBook();

        try {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`Failed to fetch document (${response.status})`);
            }
            const buffer = await response.arrayBuffer();
            const book = await loadEpubBook(buffer);
            bookRef.current = book;

            const [metadata, navigation, coverUrl] = await Promise.all([
                book.loaded.metadata,
                book.loaded.navigation,
                book.coverUrl(),
            ]);

            const metaRecord = metadata as Record<string, string | undefined>;
            setMeta({
                title: metadata.title?.trim() || 'Untitled',
                author: metadata.creator?.trim() || 'Unknown',
                description: metadata.description || '',
                series: metaRecord.series?.trim(),
                seriesIndex: metaRecord.seriesIndex?.trim(),
                coverUrl,
            });
            setToc(navigation.toc ?? []);

            const rendition = book.renderTo(host, {
                width: '100%',
                height: '100%',
                spread: 'none',
            });
            renditionRef.current = rendition;
            bindRendition(rendition);
            applyEpubTheme(rendition, settingsRef.current, appRef.current);

            const storedPos = localStorage.getItem(`${book.key()}:pos`);
            await rendition.display(storedPos || undefined);
            await ensureLocations(book);
            setBookReady(true);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load EPUB');
        } finally {
            setLoading(false);
        }
    }, [bindRendition, destroyBook]);

    const goPrev = useCallback(() => {
        renditionRef.current?.prev();
    }, []);

    const goNext = useCallback(() => {
        renditionRef.current?.next();
    }, []);

    const goToHref = useCallback((href: string) => {
        renditionRef.current?.display(href).catch(() => undefined);
    }, []);

    const goToCfi = useCallback((cfi: string) => {
        renditionRef.current?.display(cfi);
    }, []);

    const goToLocation = useCallback((value: number) => {
        const book = bookRef.current;
        const rendition = renditionRef.current;
        if (!book || !rendition) {
            return;
        }
        const cfi = book.locations.cfiFromLocation(value);
        if (cfi && cfi !== -1) {
            rendition.display(String(cfi));
        }
    }, []);

    const commitLocationJump = useCallback(() => {
        const book = bookRef.current;
        const trimmed = locationDraft.trim();
        if (!book || !trimmed) {
            setLocationDraft(String(locationCurrent));
            return;
        }
        const parsed = parseInt(trimmed, 10);
        if (Number.isNaN(parsed)) {
            setLocationDraft(String(locationCurrent));
            return;
        }
        const cfi = book.locations.cfiFromLocation(parsed);
        if (cfi === -1) {
            setLocationDraft(String(locationCurrent));
            return;
        }
        goToLocation(parsed);
    }, [goToLocation, locationCurrent, locationDraft]);

    const runSearch = useCallback(async () => {
        const book = bookRef.current;
        const query = searchQuery.trim();
        if (!book || !query) {
            setSearchResults([]);
            return;
        }
        setSearching(true);
        try {
            const results = await searchEpubBook(book, query);
            setSearchResults(results);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Search failed');
        } finally {
            setSearching(false);
        }
    }, [searchQuery]);

    const flashNav = useCallback((button: HTMLButtonElement | null) => {
        if (!button) {
            return;
        }
        button.classList.add('epub-nav-flash');
        window.setTimeout(() => button.classList.remove('epub-nav-flash'), 150);
    }, []);

    useEffect(() => {
        handler.on('open', ({ path }) => {
            loadDocument(path);
        }).emit('init');
        return () => destroyBook();
    }, [destroyBook, loadDocument]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }
            const prevBtn = document.querySelector('.epub-bar button.prev') as HTMLButtonElement | null;
            const nextBtn = document.querySelector('.epub-bar button.next') as HTMLButtonElement | null;
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                goNext();
                flashNav(nextBtn);
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                goPrev();
                flashNav(prevBtn);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [flashNav, goNext, goPrev]);

    useEffect(() => {
        const onResize = () => {
            const host = readerRef.current;
            const rendition = renditionRef.current;
            if (host && rendition) {
                rendition.resize(host.clientWidth, host.clientHeight);
            }
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    const sidebarTabs: { key: SidebarTab; icon: ReactNode }[] = [
        { key: 'toc', icon: <UnorderedListOutlined /> },
        { key: 'search', icon: <SearchOutlined /> },
        { key: 'info', icon: <InfoCircleOutlined /> },
        { key: 'settings', icon: <SettingOutlined /> },
    ];

    return (
        <div className="epub-viewer" ref={appRef}>
            {error && (
                <div className="error">
                    <div className="error-title">Error</div>
                    <div className="error-info">{error}</div>
                </div>
            )}

            <div
                className={`sidebar-wrapper${sidebarOpen ? '' : ' out'}`}
                onClick={() => setSidebarOpen(false)}
            >
                <div className="sidebar" onClick={e => e.stopPropagation()}>
                    <div className="tab-list">
                        {sidebarTabs.map(tab => (
                            <a
                                key={tab.key}
                                className={`item${sidebarTab === tab.key ? ' active' : ''}`}
                                onClick={() => setSidebarTab(tab.key)}
                            >
                                <span className="icon">{tab.icon}</span>
                            </a>
                        ))}
                    </div>
                    <div className="tab-container">
                        {sidebarTab === 'toc' && (
                            <div className="tab toc">
                                <div className="toc-list">
                                    {toc.length ? (
                                        <TocItems items={toc} indent={0} activeHref={activeTocHref} onSelect={goToHref} />
                                    ) : null}
                                </div>
                            </div>
                        )}

                        {sidebarTab === 'search' && (
                            <div className="tab search">
                                <div className="search-bar">
                                    <input
                                        type="text"
                                        className="search-box"
                                        placeholder="Search book..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                runSearch();
                                            }
                                        }}
                                    />
                                    <button type="button" className="search-button" onClick={runSearch} disabled={searching}>
                                        <span className="icon"><SearchOutlined /></span>
                                    </button>
                                </div>
                                <div className="search-results">
                                    {searchResults.map(result => {
                                        const book = bookRef.current;
                                        const width = book
                                            ? `${(book.locations.percentageFromCfi(result.cfi) * 100).toFixed(1)}%`
                                            : '0%';
                                        return (
                                            <a
                                                key={result.cfi}
                                                className="item"
                                                href="#"
                                                onClick={e => {
                                                    e.preventDefault();
                                                    goToCfi(result.cfi);
                                                }}
                                            >
                                                <div className="text">{result.excerpt.trim()}</div>
                                                <div className="pbar">
                                                    <div className="pbar-inner" style={{ width }} />
                                                </div>
                                            </a>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {sidebarTab === 'info' && (
                            <div className="tab info">
                                {meta?.coverUrl ? (
                                    <div className="cover-wrapper">
                                        <img className="cover" src={meta.coverUrl} alt="cover" />
                                    </div>
                                ) : null}
                                {meta ? (
                                    <>
                                        <div className="title">{meta.title}</div>
                                        {meta.series ? (
                                            <div className="series-info">
                                                <span className="series-name">{meta.series}</span>
                                                {meta.seriesIndex ? (
                                                    <>
                                                        <span className="divider"> - </span>
                                                        <span className="series-index">{meta.seriesIndex}</span>
                                                    </>
                                                ) : null}
                                            </div>
                                        ) : null}
                                        <div className="author">{meta.author}</div>
                                        {meta.description ? (
                                            <div className="description" dangerouslySetInnerHTML={{ __html: meta.description }} />
                                        ) : null}
                                    </>
                                ) : null}
                            </div>
                        )}

                        {sidebarTab === 'settings' && (
                            <div className="tab settings">
                                <div className="setting">
                                    <div className="setting-label">Themes</div>
                                    <div className="setting-content theme chips" data-chips="theme">
                                        {THEME_OPTIONS.map(option => (
                                            <div
                                                key={option.value}
                                                className={`theme chip${settings.theme === option.value ? ' active' : ''}`}
                                                style={{ background: option.bg, color: option.fg }}
                                                onClick={() => updateSetting('theme', option.value)}
                                            >
                                                {option.label}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="setting">
                                    <div className="setting-label">Font</div>
                                    <div className="setting-content font chips" data-chips="font">
                                        {FONT_OPTIONS.map(option => (
                                            <div
                                                key={option.value}
                                                className={`font chip${settings.font === option.value ? ' active' : ''}`}
                                                style={{ fontFamily: option.value }}
                                                onClick={() => updateSetting('font', option.value)}
                                            >
                                                {option.label}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="setting">
                                    <div className="setting-label">Font Size</div>
                                    <div className="setting-content font-size chips" data-chips="font-size">
                                        {FONT_SIZE_OPTIONS.map(size => (
                                            <div
                                                key={size}
                                                className={`size chip${settings.fontSize === size ? ' active' : ''}`}
                                                style={{ fontSize: size }}
                                                onClick={() => updateSetting('fontSize', size)}
                                            >
                                                {size.replace('pt', '')}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="setting">
                                    <div className="setting-label">Line Spacing</div>
                                    <div className="setting-content line-spacing chips" data-chips="line-spacing">
                                        {LINE_SPACING_OPTIONS.map(value => (
                                            <div
                                                key={value}
                                                className={`size chip${settings.lineSpacing === value ? ' active' : ''}`}
                                                onClick={() => updateSetting('lineSpacing', value)}
                                            >
                                                {value}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="setting">
                                    <div className="setting-label">Reset</div>
                                    <div className="setting-content">
                                        <a
                                            href="#"
                                            onClick={e => {
                                                e.preventDefault();
                                                resetAllSettings();
                                            }}
                                        >
                                            Reset All
                                        </a>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="epub-bar">
                <div className="left">
                    <button
                        type="button"
                        className={`sidebar-button${bookReady ? '' : ' hidden'}`}
                        onClick={() => setSidebarOpen(true)}
                    >
                        <span className="icon"><MenuOutlined /></span>
                    </button>
                </div>
                <div className="title">
                    {meta ? (
                        <>
                            <span className="book-title">{meta.title}</span>
                            <span className="divider"> - </span>
                            <span className="book-author">{meta.author}</span>
                        </>
                    ) : null}
                </div>
                <div className="right" />
            </div>

            <div className="epub-reader">
                {loading && (
                    <div className="epub-loading">
                        <Spin />
                    </div>
                )}
                <div className="epub-reader-host" ref={readerRef} />
            </div>

            <div className="epub-bar">
                <div className="left">
                    <button type="button" className={`prev${bookReady ? '' : ' hidden'}`} disabled={atStart} onClick={goPrev}>
                        <span className="icon"><LeftOutlined /></span>
                    </button>
                </div>
                <div className="loc">
                    {bookReady && locationTotal > 0 ? (
                        <span className="loc-jump">
                            <input
                                type="text"
                                inputMode="numeric"
                                className="loc-input"
                                aria-label="Current location"
                                value={locationDraft}
                                onChange={e => setLocationDraft(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        e.currentTarget.blur();
                                    }
                                }}
                                onBlur={commitLocationJump}
                            />
                            <span className="loc-total">/{locationTotal}</span>
                        </span>
                    ) : null}
                </div>
                <div className="right">
                    <button type="button" className={`next${bookReady ? '' : ' hidden'}`} disabled={atEnd} onClick={goNext}>
                        <span className="icon"><RightOutlined /></span>
                    </button>
                </div>
            </div>
        </div>
    );
}
