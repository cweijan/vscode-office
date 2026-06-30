import { MoonOutlined, SunOutlined } from '@ant-design/icons';
import { App, Input, type InputRef, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '@vscode/codicons/dist/codicon.css';
import { $t } from '../../i18n/i18nConfig.ts';
import { handler, vscodeApi } from '../../util/vscode.ts';
import { loadOfficeBuffer } from '../../util/loadOfficeContent.ts';
import SponsorBar from '../components/SponsorBar.tsx';
import {
    formatCellValue,
    getPageSize,
    isColumnEditable,
    openParquetFile,
    parseCellInput,
    readAllParquetRows,
    writeParquetBuffer,
    type ParquetColumnInfo,
    type ParquetFileInfo,
} from './parquetParser.ts';
import './Parquet.less';

const PAGE_SIZE = getPageSize();
const PARQUET_VSCODE_THEME_KEY = 'parquet-vscode-theme';

type ColumnIconKind = 'bool' | 'numeric' | 'string' | 'datetime' | 'structure' | 'field';

function loadParquetVscodeTheme(): boolean {
    const state = vscodeApi?.getState?.() as { parquetVscodeTheme?: boolean } | undefined;
    if (state?.parquetVscodeTheme !== undefined) {
        return state.parquetVscodeTheme;
    }
    try {
        const saved = localStorage.getItem(PARQUET_VSCODE_THEME_KEY);
        if (saved !== null) {
            return saved === '1';
        }
    } catch { }
    return true;
}

function saveParquetVscodeTheme(vscodeTheme: boolean) {
    try {
        localStorage.setItem(PARQUET_VSCODE_THEME_KEY, vscodeTheme ? '1' : '0');
    } catch { }
    if (vscodeApi?.setState) {
        const prev = (vscodeApi.getState?.() ?? {}) as Record<string, unknown>;
        vscodeApi.setState({ ...prev, parquetVscodeTheme: vscodeTheme });
    }
}

function resolveColumnIcon(type: string): { icon: string; kind: ColumnIconKind } {
    const upper = `${type}`.toUpperCase();
    if (upper.includes('BOOL')) return { icon: 'codicon-symbol-boolean', kind: 'bool' };
    if (upper.includes('INT') || upper.includes('FLOAT') || upper.includes('DOUBLE') || upper.includes('DECIMAL') || upper.includes('NUM')) {
        return { icon: 'codicon-symbol-numeric', kind: 'numeric' };
    }
    if (upper.includes('STRING') || upper.includes('BYTE') || upper.includes('UTF8')) {
        return { icon: 'codicon-symbol-string', kind: 'string' };
    }
    if (upper.includes('TIME') || upper.includes('DATE')) {
        return { icon: 'codicon-symbol-event', kind: 'datetime' };
    }
    if (upper.includes('JSON') || upper.includes('STRUCT') || upper.includes('MAP') || upper.includes('LIST')) {
        return { icon: 'codicon-symbol-structure', kind: 'structure' };
    }
    return { icon: 'codicon-symbol-field', kind: 'field' };
}

type TableRow = Record<string, unknown> & { key: string };

function ParquetViewer() {
    const { message } = App.useApp();
    const [fileInfo, setFileInfo] = useState<ParquetFileInfo | null>(null);
    const [allRows, setAllRows] = useState<Record<string, unknown>[]>([]);
    const [page, setPage] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editingRow, setEditingRow] = useState<number | null>(null);
    const [editingColumn, setEditingColumn] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [readOnly, setReadOnly] = useState(false);
    const [vscodeTheme, setVscodeTheme] = useState(loadParquetVscodeTheme);
    const readOnlyRef = useRef(false);
    const fileInfoRef = useRef<ParquetFileInfo | null>(null);
    const allRowsRef = useRef<Record<string, unknown>[]>([]);
    const dirtyRef = useRef(false);
    const savingRef = useRef(false);
    const editInputRef = useRef<InputRef | null>(null);

    const totalPages = useMemo(() => {
        if (!fileInfo?.rowCount) return 1;
        return Math.max(1, Math.ceil(fileInfo.rowCount / PAGE_SIZE));
    }, [fileInfo?.rowCount]);

    const tableRows = useMemo<TableRow[]>(() => {
        const start = page * PAGE_SIZE;
        return allRows.slice(start, start + PAGE_SIZE).map((row, index) => ({
            ...row,
            key: `${page}-${index}`,
        }));
    }, [allRows, page]);

    const toggleTheme = () => {
        setVscodeTheme((prev) => {
            const next = !prev;
            saveParquetVscodeTheme(next);
            return next;
        });
    };

    const cancelEdit = useCallback(() => {
        setEditingRow(null);
        setEditingColumn(null);
        setEditValue('');
    }, []);

    const markDirty = useCallback(() => {
        if (dirtyRef.current) return;
        dirtyRef.current = true;
        setDirty(true);
        handler.emit('change');
    }, []);

    const handleSave = useCallback(() => {
        const info = fileInfoRef.current;
        if (!info || !dirtyRef.current || savingRef.current || readOnlyRef.current) return;
        savingRef.current = true;
        setSaving(true);
        try {
            const buffer = writeParquetBuffer(info.columns, allRowsRef.current);
            handler.emit('save', [...new Uint8Array(buffer)]);
        } catch (e) {
            savingRef.current = false;
            setSaving(false);
            const errMessage = e instanceof Error ? e.message : 'Failed to serialize parquet file';
            setError(errMessage);
            message.error(errMessage);
        }
    }, [message]);

    const startEdit = useCallback((rowIndex: number, column: ParquetColumnInfo, value: unknown) => {
        if (readOnlyRef.current || !isColumnEditable(column.type)) return;
        setEditingRow(rowIndex);
        setEditingColumn(column.name);
        setEditValue(formatCellValue(value));
    }, []);

    useEffect(() => {
        if (editingRow == null || !editingColumn) return;
        editInputRef.current?.focus();
        editInputRef.current?.select();
    }, [editingColumn, editingRow]);

    const commitEdit = useCallback((rowIndex: number, column: ParquetColumnInfo) => {
        if (editingRow !== rowIndex || editingColumn !== column.name) return;
        const rows = [...allRowsRef.current];
        const row = rows[rowIndex];
        if (!row) {
            cancelEdit();
            return;
        }
        const nextValue = parseCellInput(editValue, column.type);
        if (formatCellValue(row[column.name]) === formatCellValue(nextValue)) {
            cancelEdit();
            return;
        }
        row[column.name] = nextValue;
        allRowsRef.current = rows;
        setAllRows(rows);
        cancelEdit();
        markDirty();
    }, [cancelEdit, editValue, editingColumn, editingRow, markDirty]);

    const loadParquet = useCallback(async (payload: { path?: string; buffer?: number[]; readOnly?: boolean }) => {
        setLoading(true);
        setError(null);
        setFileInfo(null);
        fileInfoRef.current = null;
        setAllRows([]);
        allRowsRef.current = [];
        setPage(0);
        cancelEdit();
        dirtyRef.current = false;
        setDirty(false);
        savingRef.current = false;
        setSaving(false);
        const fileReadOnly = payload.readOnly === true;
        readOnlyRef.current = fileReadOnly;
        setReadOnly(fileReadOnly);
        try {
            const buffer = await loadOfficeBuffer(payload);
            const info = await openParquetFile(buffer);
            const rows = await readAllParquetRows(info.file, info.metadata);
            const nextInfo = { ...info, rowCount: rows.length };
            fileInfoRef.current = nextInfo;
            setFileInfo(nextInfo);
            allRowsRef.current = rows;
            setAllRows(rows);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load parquet file');
        } finally {
            setLoading(false);
        }
    }, [cancelEdit]);

    const tableColumns = useMemo<ColumnsType<TableRow>>(() => {
        if (!fileInfo) return [];
        const cols: ColumnsType<TableRow> = [
            {
                title: '#',
                key: '__index',
                width: 64,
                align: 'center',
                fixed: 'left',
                render: (_value, _row, index) => page * PAGE_SIZE + index + 1,
            },
        ];
        for (const column of fileInfo.columns) {
            cols.push({
                title: column.name,
                dataIndex: column.name,
                key: column.name,
                ellipsis: true,
                minWidth: 120,
                render: (value: unknown, _row, index) => {
                    const rowIndex = page * PAGE_SIZE + index;
                    const editing = editingRow === rowIndex && editingColumn === column.name;
                    if (editing) {
                        return (
                            <Input
                                ref={editInputRef}
                                size="small"
                                className="parquet-viewer__cell-input"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => commitEdit(rowIndex, column)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') commitEdit(rowIndex, column);
                                    if (e.key === 'Escape') cancelEdit();
                                }}
                            />
                        );
                    }
                    return (
                        <span
                            className={`parquet-viewer__cell${!readOnly && isColumnEditable(column.type) ? ' parquet-viewer__cell--editable' : ''}`}
                            title={formatCellValue(value)}
                            onDoubleClick={() => startEdit(rowIndex, column, value)}
                        >
                            {formatCellValue(value)}
                        </span>
                    );
                },
            });
        }
        return cols;
    }, [cancelEdit, commitEdit, editValue, editingColumn, editingRow, fileInfo, page, readOnly, startEdit]);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 's') return;
            event.preventDefault();
            handleSave();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [handleSave]);

    useEffect(() => {
        handler
            .on('open', (payload) => { void loadParquet(payload); })
            .on('saveDone', () => {
                savingRef.current = false;
                setSaving(false);
                dirtyRef.current = false;
                setDirty(false);
                message.success($t('parquet.saveSuccess'));
            })
            .emit('init');
    }, [loadParquet, message]);

    const tableHeight = 'calc(100vh - 132px)';

    return (
        <div className={`parquet-viewer${vscodeTheme ? '' : ' parquet-viewer--light'}`}>
            {loading && (
                <div className="parquet-viewer__overlay">
                    <span className="codicon codicon-loading codicon-modifier-spin" />
                    <span>{$t('parquet.loading')}</span>
                </div>
            )}
            <div className="parquet-viewer__body">
                <aside className="parquet-viewer__sider">
                    <div className="parquet-viewer__sider-inner">
                        <div className="parquet-viewer__sider-header">
                            <span className="codicon codicon-symbol-structure parquet-icon parquet-icon--schema" />
                            {$t('parquet.schema')}
                        </div>
                        {fileInfo && (
                            <div className="parquet-viewer__meta">
                                <div className="parquet-viewer__stat">
                                    <span className="parquet-viewer__stat-label">
                                        <span className="codicon codicon-list-flat parquet-icon parquet-icon--rows" />
                                        {$t('parquet.rows')}
                                    </span>
                                    <span className="parquet-viewer__stat-value">{fileInfo.rowCount.toLocaleString()}</span>
                                </div>
                                <div className="parquet-viewer__stat">
                                    <span className="parquet-viewer__stat-label">
                                        <span className="codicon codicon-symbol-field parquet-icon parquet-icon--columns" />
                                        {$t('parquet.columnsLabel')}
                                    </span>
                                    <span className="parquet-viewer__stat-value">{fileInfo.columns.length}</span>
                                </div>
                                {fileInfo.createdBy && (
                                    <div className="parquet-viewer__stat parquet-viewer__stat--wide" title={fileInfo.createdBy}>
                                        <span className="parquet-viewer__stat-label">
                                            <span className="codicon codicon-account parquet-icon parquet-icon--author" />
                                            {$t('parquet.createdBy')}
                                        </span>
                                        <span className="parquet-viewer__stat-value">
                                            {fileInfo.createdBy.length > 48 ? `${fileInfo.createdBy.slice(0, 48)}…` : fileInfo.createdBy}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="parquet-viewer__list">
                            {fileInfo?.columns.map((column) => {
                                const { icon, kind } = resolveColumnIcon(column.type);
                                return (
                                <div key={column.name} className="parquet-viewer__list-item">
                                    <span className={`codicon parquet-viewer__list-icon parquet-viewer__list-icon--${kind} ${icon}`} />
                                    <span className="parquet-viewer__list-name" title={column.name}>{column.name}</span>
                                    <span className="parquet-viewer__list-type">{column.type}</span>
                                </div>
                                );
                            })}
                        </div>
                    </div>
                </aside>
                <main className="parquet-viewer__main">
                    {readOnly && !loading && !error && fileInfo && (
                        <div className="parquet-viewer__readonly-banner">
                            {$t('viewer.readOnly')}
                        </div>
                    )}
                    {error ? (
                        <div className="parquet-viewer__empty">
                            <div className="parquet-viewer__error">
                                <span className="codicon codicon-error" />
                                <span>{error}</span>
                            </div>
                        </div>
                    ) : fileInfo ? (
                        <>
                            <div className="parquet-viewer__toolbar">
                                <div className="parquet-viewer__toolbar-left">
                                    {dirty && <span className="parquet-viewer__dirty-dot" title={$t('parquet.unsaved')} />}
                                    <button
                                        type="button"
                                        className="parquet-viewer__save-btn"
                                        disabled={!dirty || saving || readOnly}
                                        onClick={handleSave}
                                    >
                                        <span className={`codicon ${saving ? 'codicon-loading codicon-modifier-spin' : 'codicon-save'}`} />
                                        {$t('parquet.save')}
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    className="parquet-theme-toggle"
                                    title={vscodeTheme ? $t('common.switchToLight') : $t('common.switchToDark')}
                                    onClick={toggleTheme}
                                    aria-label={vscodeTheme ? $t('common.switchToLight') : $t('common.switchToDark')}
                                >
                                    {vscodeTheme ? <SunOutlined /> : <MoonOutlined />}
                                </button>
                            </div>
                            <div className="parquet-viewer__table-wrap">
                                <Table<TableRow>
                                    className="parquet-table"
                                    dataSource={tableRows}
                                    columns={tableColumns}
                                    pagination={false}
                                    size="small"
                                    scroll={{ y: tableHeight, x: 'max-content' }}
                                />
                            </div>
                            <div className="parquet-viewer__footer">
                                <span className="parquet-viewer__footer-total">
                                    {$t('parquet.totalRows', { count: fileInfo.rowCount.toLocaleString() })}
                                </span>
                                <div className="parquet-viewer__pager">
                                    <button
                                        type="button"
                                        className="parquet-viewer__pager-btn"
                                        disabled={page <= 0}
                                        onClick={() => { cancelEdit(); setPage((p) => Math.max(0, p - 1)); }}
                                        aria-label="Previous page"
                                    >
                                        <span className="codicon codicon-chevron-left" />
                                    </button>
                                    <span className="parquet-viewer__pager-info">{page + 1} / {totalPages}</span>
                                    <button
                                        type="button"
                                        className="parquet-viewer__pager-btn"
                                        disabled={page >= totalPages - 1}
                                        onClick={() => { cancelEdit(); setPage((p) => Math.min(totalPages - 1, p + 1)); }}
                                        aria-label="Next page"
                                    >
                                        <span className="codicon codicon-chevron-right" />
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : null}
                </main>
            </div>
            <div className="parquet-viewer__corner-actions">
                {!loading && <SponsorBar placement="left" />}
            </div>
        </div>
    );
}

export default function Parquet() {
    return (
        <App className="parquet-app">
            <ParquetViewer />
        </App>
    );
}
