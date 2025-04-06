import { DeleteOutlined, FileTextOutlined, FolderOutlined } from '@ant-design/icons';
import type { TableProps } from 'antd';
import { Button, Popconfirm, Spin, Table } from 'antd';
import { useRef } from 'react';
import { useWindowSize } from '../../../util/reactUtils';
import { handler } from '../../../util/vscode';
import { FileInfo } from '../zipTypes';

const columns: TableProps<FileInfo>['columns'] = [
    {
        title: 'Name',
        dataIndex: 'name',
        ellipsis: true,
        sorter: (a, b) => a.name.localeCompare(b.name),
        onCell: (entry) => ({ onClick: () => handler.emit('openPath', entry) }),
        render: (text, entry) => <>
            {entry.isDirectory ? <FolderOutlined /> : <FileTextOutlined />}
            {text}
        </>,
    },
    {
        title: 'Modified', dataIndex: 'modifyDateTime',
        width: 160, ellipsis: true, onCell: (entry) => ({ onClick: () => handler.emit('openPath', entry) })
    },
    {
        title: 'Size', dataIndex: 'compressedSize', width: 70,
        ellipsis: true,
        sortDirections: ['descend', 'ascend'],
        sorter: (a, b) => a.compressedSizeOrigin - b.compressedSizeOrigin,
    },
    {
        title: 'Origin', dataIndex: 'fileSize', width: 80,
        sortDirections: ['descend', 'ascend'],
        sorter: (a, b) => a.fileSizeOrigin - b.fileSizeOrigin,
    },
    {
        title: 'Action',
        key: 'action',
        width: 60,
        render: (_, entry) => (
            <>
                <Popconfirm
                    title="Delete the file"
                    description="Are you sure to delete this file?"
                    onConfirm={() => {
                        handler.emit('removeFile', entry.entryName)
                    }}
                    okText="Yes"
                    cancelText="No"
                >
                    <Button type="primary" danger>
                        <DeleteOutlined />
                    </Button>
                </Popconfirm>
            </>
        ),
    }
];

export default function FileItems({ items }) {
    const [_, height] = useWindowSize();
    const loading = useRef(true)
    if (items.length) loading.current = false
    return (
        <Spin spinning={loading.current}>
            <Table columns={columns} rowKey="entryName" dataSource={items}
                style={{ height: height - 50, overflow: 'auto' }} pagination={false} expandable={{ showExpandColumn: false }}
            />
        </Spin>
    )
}