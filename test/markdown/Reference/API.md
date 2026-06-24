# API 参考

索引：[[Home]]  
术语：[[Reference/Glossary]]

#reference #api

## 认证

认证模块说明。客户端须携带 Token。 ^auth-section

```
Authorization: Bearer <token>
```

从 [[Projects/Vditor]] 跳转至此块：[[Reference/API#^auth-section]]

## 双链解析

解析 `[[path]]` 与 `[[path|alias]]`。 ^api-wikilink

## 嵌入

解析 `![[path]]` 为嵌入节点。 ^api-embed

## Callout

解析 `> [!TYPE] Title` 为 callout 块。 ^api-callout

> [!CAUTION] 破坏性变更
> 修改 Lute Obsidian 选项可能影响已有文档渲染。

## 错误码

| 码 | 说明 |
| --- | --- |
| 400 | 请求无效 |
| 401 | 见 [[Reference/API#^auth-section]] |

错误码表 ^api-errors
