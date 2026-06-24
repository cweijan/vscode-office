# 术语表

[[Home]] · [[Reference/API]]

#glossary #reference

## WikiLink

Obsidian 双链语法：`[[目标页面]]`、`[[路径/页面|别名]]`。 ^term-wikilink

示例：[[Projects/Vditor]]、[[Notes/Meeting-Notes|会议纪要]]

## Embed

嵌入语法：`![[页面]]`，将目标页面或资源以嵌入形式展示。 ^term-embed

示例：![[Projects/Roadmap]]

## Block ID

在块末书写 `^block-id`，他处通过 `[[页面#^block-id]]` 引用。 ^term-block-id

示例块：

这是一个带块 ID 的示例段落。 ^sample-block

引用方式：[[Reference/Glossary#^sample-block]]、[[#^term-block-id]]

## Tag

标签以 `#` 开头，支持嵌套：`#a/b/c`。 ^term-tag

示例：#obsidian/test #project/vditor

## Callout

引用块扩展：`> [!NOTE] 标题`。 ^term-callout

> [!NOTE] 示例
> Callout 正文可含 [[Home]] 与 #inline-tag。

## 非 Obsidian 语法（对照）

- 标准链接：[MDN](https://developer.mozilla.org)
- 代码内：`[[not-wikilink]]`
- URL：`https://example.com#fragment`（非标签）
