import { DeleteOutlined, FileTextOutlined, FolderOutlined } from '@ant-design/icons';
import type { TableProps } from 'antd';
import { Button, Popconfirm, Spin, Table } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { handler } from '../../../util/vscode';
import { FileInfo } from '../zipTypes';

const columns: TableProps<FileInfo>['columns'] = [
    {
        title: 'Name',
        dataIndex: 'name',
        width: 300,
        onCell: (entry) => ({ onClick: () => handler.emit('openPath', entry) }),
        render: (text, entry) => <>
            {entry.isDirectory ? <FolderOutlined /> : <FileTextOutlined />}
            {text}
        </>,
    },
    { title: 'Modified', dataIndex: 'modifyDateTime', width: 190, onCell: (entry) => ({ onClick: () => handler.emit('openPath', entry) }) },
    { title: 'Compressed', dataIndex: 'compressedSize', width: 120 },
    { title: 'Origin', dataIndex: 'fileSize', width: 80 },
    {
        title: 'Action',
        key: 'action',
        width: 60,
        render: (_, entry) => (
            <>
                {/* 需要上色 */}
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
    const [height, setHeight] = useState(window.innerHeight - 100)
    const loading = useRef(null)
    loading.current = loading.current == null
    useEffect(() => {
        window.addEventListener('resize', () => {
            setHeight(window.innerHeight - 100)
        })
    }, [])
    return (
        <Spin spinning={loading.current}>
            <Table columns={columns} rowKey="entryName" dataSource={items}
                style={{ height, overflow: 'auto' }} pagination={false} expandable={{ showExpandColumn: false }}
            />
        </Spin>
    )
}