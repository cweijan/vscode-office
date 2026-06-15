import { useMemo, useRef, useState } from 'react';
import { handler } from '../../../util/vscode';
import { IconDelete, IconSort } from '../icons';
import { FileTypeIcon } from './FileTypeIcon';
import { FileInfo } from '../zipTypes';

type SortField = 'name' | 'modifyDateTime' | 'compressedSize' | 'fileSize';
type SortDirection = 'asc' | 'desc';

interface FileItemsProps {
    items: FileInfo[];
    onOpenPath: (entry: FileInfo) => void;
}

interface Column {
    key: SortField | 'action';
    title: string;
    width?: string;
    sortable?: boolean;
    align?: 'left' | 'center' | 'right';
}

const columns: Column[] = [
    { key: 'name', title: 'Name', sortable: true },
    { key: 'modifyDateTime', title: 'Modified', width: '160px', sortable: true },
    { key: 'compressedSize', title: 'Size', width: '88px', sortable: true, align: 'right' },
    { key: 'fileSize', title: 'Origin', width: '96px', sortable: true, align: 'right' },
    { key: 'action', title: '', width: '44px', align: 'center' },
];

function compareItems(a: FileInfo, b: FileInfo, field: SortField, direction: SortDirection) {
    let result = 0;
    if (field === 'name') {
        result = (a.name ?? '').localeCompare(b.name ?? '');
    } else if (field === 'modifyDateTime') {
        result = String(a.modifyDateTime ?? '').localeCompare(String(b.modifyDateTime ?? ''));
    } else if (field === 'compressedSize') {
        result = (a.compressedSizeOrigin ?? 0) - (b.compressedSizeOrigin ?? 0);
    } else if (field === 'fileSize') {
        result = (a.fileSizeOrigin ?? 0) - (b.fileSizeOrigin ?? 0);
    }
    return direction === 'asc' ? result : -result;
}

function DeleteButton({ entryName }: { entryName: string }) {
    const [confirming, setConfirming] = useState(false);

    if (!confirming) {
        return (
            <button
                type="button"
                className="zip-delete-btn"
                title="Delete file"
                onClick={(e) => {
                    e.stopPropagation();
                    setConfirming(true);
                }}
            >
                <IconDelete size={14} />
            </button>
        );
    }

    return (
        <div className="zip-delete-confirm" onClick={(e) => e.stopPropagation()}>
            <span>Delete?</span>
            <button
                type="button"
                className="zip-delete-yes"
                onClick={() => handler.emit('removeFile', entryName)}
            >
                Yes
            </button>
            <button type="button" className="zip-delete-no" onClick={() => setConfirming(false)}>
                No
            </button>
        </div>
    );
}

export default function FileItems({ items, onOpenPath }: FileItemsProps) {
    const loading = useRef(true);
    const [sortField, setSortField] = useState<SortField>('name');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

    if (items.length) loading.current = false;

    const sortedItems = useMemo(() => {
        let parentEntry: FileInfo | undefined;
        const rest: FileInfo[] = [];
        for (const item of items) {
            if (item.name === '..') {
                parentEntry = item;
            } else {
                rest.push(item);
            }
        }

        rest.sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            return compareItems(a, b, sortField, sortDirection);
        });

        return parentEntry ? [parentEntry, ...rest] : rest;
    }, [items, sortField, sortDirection]);

    const toggleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    return (
        <div className="zip-file-list">
            {loading.current ? (
                <div className="zip-loading">
                    <div className="zip-spinner" />
                    <span>Loading archive...</span>
                </div>
            ) : null}

            <table className="zip-table">
                <thead>
                    <tr>
                        {columns.map(col => (
                            <th
                                key={col.key}
                                style={{ width: col.width }}
                                className={col.align ? `align-${col.align}` : undefined}
                            >
                                {col.sortable ? (
                                    <button
                                        type="button"
                                        className={`zip-sort-btn${sortField === col.key ? ' active' : ''}`}
                                        onClick={() => toggleSort(col.key as SortField)}
                                    >
                                        <span>{col.title}</span>
                                        <IconSort
                                            size={12}
                                            className={sortField === col.key && sortDirection === 'desc' ? 'desc' : ''}
                                        />
                                    </button>
                                ) : col.title}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {sortedItems.map(entry => (
                        <tr
                            key={entry.entryName ?? entry.name}
                            className="zip-table-row"
                            onClick={() => onOpenPath(entry)}
                        >
                            <td>
                                <span className="zip-file-name">
                                    <FileTypeIcon name={entry.name} isDirectory={entry.isDirectory} />
                                    <span>{entry.name}</span>
                                </span>
                            </td>
                            <td className="zip-cell-muted">{entry.modifyDateTime ?? ''}</td>
                            <td className="align-right">{entry.compressedSize ?? ''}</td>
                            <td className="align-right">{entry.fileSize ?? ''}</td>
                            <td className="align-center">
                                {entry.name === '..' || entry.isDirectory ? null : (
                                    <DeleteButton entryName={entry.entryName!} />
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {!loading.current && sortedItems.length === 0 ? (
                <div className="zip-empty">This folder is empty.</div>
            ) : null}
        </div>
    );
}
