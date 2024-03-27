import { DeleteOutlined, FileTextOutlined, FolderOutlined } from '@ant-design/icons';
import type { TableProps } from 'antd';
import { Popconfirm, Table } from 'antd';
import { useEffect, useState } from 'react';
import { handler } from '../../../util/vscode';
import { FileInfo } from '../zipTypes';

const columns: TableProps<FileInfo>['columns'] = [
    {
        title: 'Name',
        dataIndex: 'name',
        render: (text, entry) => <div onClick={() => {
            handler.emit('openPath', entry)
        }}>
            {entry.isDirectory ? <FolderOutlined /> : <FileTextOutlined />}
            {text}
        </div>,
    },
    { title: 'Modified', dataIndex: 'modifyDateTime', },
    { title: 'Compressed', dataIndex: 'compressedSize', },
    { title: 'Origin', dataIndex: 'fileSize', },
    {
        title: 'Action',
        key: 'tags',
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
                    <DeleteOutlined />
                </Popconfirm>
            </>
        ),
    }
];

export default function FileItems({ items }) {
    const [y, setY] = useState(window.innerHeight - 100)
    // const [loading, setLoading] = useState(false)
    useEffect(() => {
        window.addEventListener('resize', () => {
            setY(window.innerHeight - 100)
        })
    }, [])
    return <Table columns={columns} dataSource={items} scroll={{ y }} expandable={{ showExpandColumn: false }} />;
}