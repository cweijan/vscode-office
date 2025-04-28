# Office Viewer

## 介绍

本扩展支持在VS Code中预览以下常见的办公文件格式：

- Excel: .xls, .xlsx, .csv
- Word: .docx
- Svg: .svg
- Pdf: .pdf
- 字体: .ttf, .otf, .woff, .woff2
- Markdown: .md
- HTTP请求: .http
- Windows注册表: .reg
- 压缩文件: .zip, .jar, .vsix, .rar

## Markdown

集成[Vditor](https://github.com/Vanessa219/vditor)实现对markdown的所见即所得编辑, **注意这个编辑器不再积极维护**.

如果你需要使用原生markdown编辑器, 在vscode设置中增加以下配置.

```json
{
    "workbench.editorAssociations": {
        "*.md": "default",
        "*.markdown": "default"
    }
}
```

- 在编辑器打开右键菜单可将markdown导出为pdf, docx或者html, pdf依赖于chromium, 可通过 `vscode-office.chromiumPath`配置chromium浏览器路径.
  ![1685418034035](image/README-CN/1685418034035.png)

快捷键: 基于[Vditor快捷键](shortcut.md)以及更多:

- 将列表上移一行: `Ctrl Alt I` / `⌘ ^ I`
- 将列表下移一行: `Ctrl Alt J` / `⌘ ^ J`
- 在VS Code中编辑: `Ctrl Alt E` / `⌘ ^ E`

## 其他功能

- 图标主题: 内置了Material Icon Theme部分icon
- Excel: 支持对xlsx, csv等excel文件进行预览和保存(注意xlsx保存会丢失格式, csv则不支持gbk中文)
- HTML: 编辑HTML的过程中按下ctrl+shift+v可实时预览.
- PDF: 支持直接预览pdf文件
- HTTP: 用于发送http请求, 由于REST Client本地请求有bug, 修改后进行集成.

## Sponsor

[![Database Client](https://database-client.com/text_logo.png)](https://marketplace.visualstudio.com/items?itemName=cweijan.vscode-database-client2)

适用于Visual Studio Code的数据库客户端, 支持**MySQL/MariaDB, PostgreSQL, SQLite, Redis**以及**ElasticSearch**等数据库的管理, 且可作为一个SSH客户端, 极大地提升您的生产力! [立刻安装](https://marketplace.visualstudio.com/items?itemName=cweijan.vscode-database-client2).

## Credits

- PDF rendering: [mozilla/pdf.js/](https://github.com/mozilla/pdf.js/)
- Docx rendering: [VolodymyrBaydalka/docxjs](https://github.com/VolodymyrBaydalka/docxjs)
- XLSX rendering:
  - [SheetJS/sheetjs](https://github.com/SheetJS/sheetjs): XLSX parsing
  - [myliang/x-spreadsheet](https://github.com/myliang/x-spreadsheet): XLSX rendering
- HTTP: [Rest  Client](https://github.com/Huachao/vscode-restclient)
- Markdown: [Vanessa219/vditor](https://github.com/Vanessa219/vditor)
- Material Icon theme: [PKief/vscode-material-icon-theme](https://github.com/PKief/vscode-material-icon-theme)
