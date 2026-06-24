---
title: 首页
tags: [obsidian, test, hub]
---

# 测试库首页

这是 Obsidian 语法多文件测试库的入口。从本页可跳转到各子页面，验证**跨文件双链**、**块引用**、**嵌入**与 **Callout**。

## 快速导航

| 主题 | 链接 |
| --- | --- |
| 项目 | [[Projects/Vditor]]、[[Projects/Roadmap]] |
| 笔记 | [[Notes/Meeting-Notes]]、[[Notes/Daily-2026-06-24]] |
| 参考 | [[Reference/API]]、[[Reference/Glossary]] |
| Callout | [[Callouts]] |

## 双链示例

- 无别名：[[Projects/Vditor]]
- 有别名：[[Projects/Roadmap|产品路线图]]
- 子路径：[[Reference/API#认证]]

## 嵌入示例

整页嵌入：

![[Notes/Meeting-Notes]]

## 块引用（同文件）

跳转到本页「待办汇总」：[[#^home-todos]]

引用术语定义：[[Reference/Glossary#^term-wikilink]]

## 标签

本库标签：#obsidian/test #status/active

> [!TIP] 测试提示
> 建议用 VS Code 分别打开 `test/obsidian/` 下多个 `.md` 文件，检查跨文件 `[[链接]]` 是否可识别与跳转（若扩展支持）。

## 待办汇总

以下段落带有块 ID，供他页引用 `[[Home#^home-todos]]`：

- [ ] 验证 Callout 渲染
- [ ] 验证双链与嵌入
- [ ] 验证块引用 `^block-id` 与 `[[page#^id]]`
- [ ] 验证标签 #nested/tag

^home-todos
