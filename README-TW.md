# Office Viewer

## 介紹

本擴充功能支援在VS Code中預覽以下常見的辦公檔案格式：

- Excel: .xls, .xlsx, .csv
- Word: .docx
- Svg: .svg
- Pdf: .pdf
- 字型: .ttf, .otf, .woff, .woff2
- Markdown: .md
- HTTP請求: .http
- Windows登錄檔: .reg
- 壓縮檔案: .zip, .jar, .vsix, .rar

## Markdown

整合[Vditor](https://github.com/Vanessa219/vditor)實現對markdown的所見即所得編輯, **注意這個編輯器不再積極維護**.

如果你需要使用原生markdown編輯器, 在vscode設定中增加以下配置.

```json
{
    "workbench.editorAssociations": {
        "*.md": "default",
        "*.markdown": "default"
    }
}
```

- 在編輯器開啟右鍵選單可將markdown匯出為pdf, docx或者html, pdf依賴於chromium, 可透過 `vscode-office.chromiumPath`配置chromium瀏覽器路徑.
  ![1685418034035](image/README-CN/1685418034035.png)

快捷鍵: 基於[Vditor快捷鍵](shortcut.md)以及更多:

- 將清單上移一行: `Ctrl Alt I` / `⌘ ^ I`
- 將清單下移一行: `Ctrl Alt J` / `⌘ ^ J`
- 在VS Code中編輯: `Ctrl Alt E` / `⌘ ^ E`

## 其他功能

- 圖示主題: 內建了Material Icon Theme部分icon
- Excel: 支援對xlsx, csv等excel檔案進行預覽和儲存(注意xlsx儲存會丟失格式, csv則不支援gbk中文)
- HTML: 編輯HTML的過程中按下ctrl+shift+v可實時預覽.
- PDF: 支援直接預覽pdf檔案
- HTTP: 用於傳送http請求, 由於REST Client本地請求有bug, 修改後進行整合.

## Sponsor

[![Database Client](https://database-client.com/text_logo.png)](https://marketplace.visualstudio.com/items?itemName=cweijan.vscode-database-client2)

適用於Visual Studio Code的數據庫客戶端, 支援**MySQL/MariaDB, PostgreSQL, SQLite, Redis**以及**ElasticSearch**等數據庫的管理, 且可作為一個SSH客戶端, 極大地提升您的生產力! [立刻安裝](https://marketplace.visualstudio.com/items?itemName=cweijan.vscode-database-client2).

## Credits

- PDF rendering: [mozilla/pdf.js/](https://github.com/mozilla/pdf.js/)
- Docx rendering: [VolodymyrBaydalka/docxjs](https://github.com/VolodymyrBaydalka/docxjs)
- XLSX rendering:
  - [SheetJS/sheetjs](https://github.com/SheetJS/sheetjs): XLSX parsing
  - [myliang/x-spreadsheet](https://github.com/myliang/x-spreadsheet): XLSX rendering
- HTTP: [Rest  Client](https://github.com/Huachao/vscode-restclient)
- Markdown: [Vanessa219/vditor](https://github.com/Vanessa219/vditor)
- Material Icon theme: [PKief/vscode-material-icon-theme](https://github.com/PKief/vscode-material-icon-theme)
