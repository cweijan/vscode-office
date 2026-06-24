# Obsidian 测试库

模拟 Obsidian Vault 的多文件 Markdown 测试集，用于 vscode-office / Vditor 手动测试。

## 目录结构

```
test/obsidian/
├── README.md           ← 本说明
├── Home.md             ← 建议从此文件打开
├── Callouts.md         ← Callout 专项
├── Projects/
│   ├── Vditor.md
│   └── Roadmap.md
├── Notes/
│   ├── Meeting-Notes.md
│   └── Daily-2026-06-24.md
└── Reference/
    ├── API.md
    └── Glossary.md
```

## 覆盖的语法

| 语法 | 示例 | 主要出现位置 |
| --- | --- | --- |
| WikiLink | `[[Home]]`、`[[Projects/Vditor|别名]]` | 所有文件互链 |
| Embed | `![[Notes/Meeting-Notes]]` | Home、Vditor、Callouts |
| 块 ID | 段落末 `^block-id` | API、Glossary、Meeting-Notes |
| 块链接 | `[[page#^block-id]]`、`[[#^id]]` | Daily、Vditor、Glossary |
| Tag | `#obsidian/test` | 各文件 frontmatter 与正文 |
| Callout | `> [!NOTE]` 等 | Callouts.md、各 Notes |

## 建议测试步骤

1. 在扩展中打开 `Home.md`。
2. 依次打开 `Projects/`、`Notes/`、`Reference/` 下文件，检查双链渲染。
3. 编辑双链、Callout、标签后保存，确认 Markdown 源码往返正确。
4. 打开 `Callouts.md` 检查五种内置 Callout 与自定义类型。
5. 在 `Reference/Glossary.md` 验证块引用 `[[#^sample-block]]` 等同页/跨页形式。

## 文件关系（简图）

```
Home ──┬── Projects/Vditor ── Reference/API
       │         │
       ├── Projects/Roadmap
       │
       ├── Notes/Meeting-Notes ── Notes/Daily-2026-06-24
       │
       ├── Reference/Glossary
       │
       └── Callouts.md
```
