# 会议纪要 — 2026-06-20

参会：[[Home]] 维护者、[[Projects/Vditor]] 负责人  
标签：#meeting #decision

## 议题

### 1. Obsidian 测试库结构

决定采用 `test/obsidian/` 多文件布局，便于测跨页双链。

决议内容 ^decision-vault

采用文件夹模拟 Obsidian Vault，每文件一个主题。

### 2. 块引用约定

- 块 ID 格式：`^kebab-case-id`
- 跨页引用：`[[Notes/Meeting-Notes#^action-items]]`
- 同页引用：`[[#^action-items]]`

### 3. 行动项

行动项列表（供他页嵌入引用）：

1. 创建测试文档集
2. 覆盖 Callout 各类型
3. 记录边界用例到 [[Reference/Glossary]]

^action-items

> [!WARNING] 未决问题
> 块引用点击后是否滚动到目标块，取决于扩展实现。

## 相关链接

- [[Reference/API#^auth-section]]
- [[Notes/Daily-2026-06-24]]
- ![[Projects/Roadmap]]
