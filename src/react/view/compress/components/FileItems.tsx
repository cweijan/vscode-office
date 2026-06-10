import { DeleteOutlined, FileTextOutlined, FolderOutlined } from '@ant-design/icons';
import type { TableProps } from 'antd';
import { Button, Popconfirm, Spin, Table } from 'antd';
import { useRef } from 'react';
import { handler } from '../../../util/vscode';
import { FileInfo } from '../zipTypes';

const columns: TableProps<FileInfo>['columns'] = [
    {
        title: 'Name',
        dataIndex: 'name',
        ellipsis: true,
        sorter: (a, b) => a.name.localeCompare(b.name),
        onCell: (entry) => ({ onClick: () => handler.emit('openPath', entry) }),
        render: (text, entry) => (
            <span className="zip-file-name">
                {entry.isDirectory ? <FolderOutlined /> : <FileTextOutlined />}
                <span>{text}</span>
            </span>
        ),
    },
    {
        title: 'Modified',
        dataIndex: 'modifyDateTime',
        width: 160,
        ellipsis: true,
        onCell: (entry) => ({ onClick: () => handler.emit('openPath', entry) }),
    },
    {
        title: 'Size',
        dataIndex: 'compressedSize',
        width: 80,
        ellipsis: true,
        sortDirections: ['descend', 'ascend'],
        sorter: (a, b) => a.compressedSizeOrigin - b.compressedSizeOrigin,
    },
    {
        title: 'Origin',
        dataIndex: 'fileSize',
        width: 90,
        sortDirections: ['descend', 'ascend'],
        sorter: (a, b) => a.fileSizeOrigin - b.fileSizeOrigin,
    },
    {
        title: '',
        key: 'action',
        width: 48,
        align: 'center',
        render: (_, entry) => (
            entry.name === '..' || entry.isDirectory ? null : (
                <Popconfirm
                    title="Delete the file"
                    description="Are you sure to delete this file?"
                    onConfirm={() => handler.emit('removeFile', entry.entryName)}
                    okText="Yes"
                    cancelText="No"
                >
                    <Button type="text" danger size="small" icon={<DeleteOutlined />} />
                </Popconfirm>
            )
        ),
    },
];

export default function FileItems({ items }) {
    const loading = useRef(true)
    if (items.length) loading.current = false

    return (
        <Spin spinning={loading.current}>
            <Table
                className="zip-table"
                size="small"
                columns={columns}
                rowKey="entryName"
                dataSource={items}
                pagination={false}
                expandable={{ showExpandColumn: false }}
            />
        </Spin>
    )
}
