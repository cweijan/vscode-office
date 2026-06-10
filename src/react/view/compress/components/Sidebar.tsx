import { FileTextOutlined, FolderOutlined } from '@ant-design/icons';
import type { TreeDataNode } from 'antd';
import { Tree } from 'antd';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FileInfo } from '../zipTypes';

export default function Sidebar({ name = '', items, currentDir, OnClickFolder }) {
    const rootKey = useRef('dbclient_zip_sidebar_root')
    const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([rootKey.current]);

    useEffect(() => {
        if (!currentDir) return;
        setExpandedKeys(keys => [...keys, currentDir]);
    }, [currentDir])

    const treeData = useMemo(() => {
        const loop = (data: FileInfo[]): TreeDataNode[] =>
            data.filter(row => row.isDirectory).map((item) => {
                const strTitle = item.name as string;
                const title = (
                    <div
                        className={`zip-tree-node${currentDir === item.entryName ? ' selected' : ''}`}
                        onClick={() => OnClickFolder?.(item.entryName)}
                    >
                        <FolderOutlined /> {strTitle}
                    </div>
                )
                if (item.children) {
                    return { title, key: item.entryName, children: loop(item.children) };
                }
                return { title, key: item.entryName };
            });
        return [{
            title: (
                <div
                    className={`zip-tree-node${!currentDir ? ' selected' : ''}`}
                    onClick={() => OnClickFolder?.(null)}
                >
                    <FileTextOutlined /> {name}
                </div>
            ),
            key: rootKey.current,
            children: loop(items)
        }]
    }, [name, currentDir, items]);

    return (
        <Tree
            onExpand={setExpandedKeys}
            expandedKeys={expandedKeys}
            autoExpandParent={false}
            treeData={treeData}
            blockNode
        />
    );
}
