import type { TreeDataNode } from 'antd';
import { Tree } from 'antd';
import React, { useMemo, useState } from 'react';
import { FileInfo } from '../zipTypes';

export default function Sidebar({ name = '', items, currentDir, OnClickFolder }) {
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([currentDir]);
  const onExpand = (newExpandedKeys: React.Key[]) => {
    setExpandedKeys(newExpandedKeys);
  };

  const treeData = useMemo(() => {
    const loop = (data: FileInfo[]): TreeDataNode[] =>
      data.filter(row => row.isDirectory).map((item) => {
        const strTitle = item.name as string;
        // active: activeDir==data.entryName
        const title = <div onClick={() => { OnClickFolder?.(item.entryName) }}>
          <span>{strTitle}</span>
        </div>
        if (item.children) {
          return { title, key: item.entryName, children: loop(item.children) };
        }
        return { title, key: item.entryName, };
      });
    return [{
      title: name,
      key: name,
      children: loop(items)
    }]
  }, [name, items]);

  const allExpandedKeys = useMemo(() => {
    return [...expandedKeys, currentDir]
  }, [expandedKeys, currentDir])

  return (
    <div>
      <Tree
        onExpand={onExpand}
        expandedKeys={allExpandedKeys}
        autoExpandParent={true}
        treeData={treeData}
      />
    </div>
  );
};
