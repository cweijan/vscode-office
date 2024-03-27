import type { TreeDataNode } from 'antd';
import { Tree } from 'antd';
import React, { useMemo, useState } from 'react';
import { FileInfo } from '../zipTypes';

export default function Sidebar({ name, items, currentDir, OnClickFolder }) {
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [autoExpandParent, setAutoExpandParent] = useState(true);

  const onExpand = (newExpandedKeys: React.Key[]) => {
    setExpandedKeys(newExpandedKeys);
    // setAutoExpandParent(false);
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
  }, [items]);

  return (
    <div>
      <Tree
        onExpand={onExpand}
        expandedKeys={expandedKeys}
        autoExpandParent={autoExpandParent}
        treeData={treeData}
      />
    </div>
  );
};
