import type { TreeDataNode } from 'antd';
import { Tree } from 'antd';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FileInfo } from '../zipTypes';
import { FileTextOutlined, FolderOutlined } from '@ant-design/icons';

export default function Sidebar({ name = '', items, currentDir, OnClickFolder }) {
  const rootKey = useRef('dbclient_zip_sidebar_root')
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([rootKey.current]);
  const onExpand = (newExpandedKeys: React.Key[]) => {
    setExpandedKeys(newExpandedKeys);
  };

  useEffect(() => {
    if (!currentDir) return;
    setExpandedKeys(keys => [...keys, currentDir]);
  }, [currentDir])

  const treeData = useMemo(() => {
    const loop = (data: FileInfo[]): TreeDataNode[] =>
      data.filter(row => row.isDirectory).map((item) => {
        const strTitle = item.name as string;
        const title = <div style={{ backgroundColor: currentDir == item.entryName ? '#f1f1f1' : null }}
          onClick={() => { OnClickFolder?.(item.entryName) }}
        >
          <FolderOutlined /> {strTitle}
        </div>
        if (item.children) {
          return { title, key: item.entryName, children: loop(item.children) };
        }
        return { title, key: item.entryName, };
      });
    return [{
      title: <div onClick={() => { OnClickFolder?.(null) }}> <FileTextOutlined /> {name} </div>,
      key: rootKey.current,
      children: loop(items)
    }]
  }, [name, currentDir, items]);

  return (
    <div>
      <Tree
        onExpand={onExpand}
        expandedKeys={expandedKeys}
        autoExpandParent={true}
        treeData={treeData}
      />
    </div>
  );
};
