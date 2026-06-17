# Office Viewer

[English](README.md) | [简体中文](README-CN.md) | 繁體中文

## 介紹

本擴充功能支援在 VS Code 中預覽以下常見的辦公檔案格式：

- Excel: `.xls`、`.xlsx`、`.xlsm`、`.csv`、`.ods`
- Word: `.docx`、`.dotx`
- PowerPoint: `.pptx`、`.pptm`
- PDF 與電子書: `.pdf`、`.epub`
- HEIC/TIFF: `.heic`、`.heif`、`.tiff`
- 設計檔案: `.psd`、`.xmind`、`.icns`、`.svg`
- 字型: `.ttf`、`.otf`、`.woff`、`.woff2`
- Markdown: `.md`、`.markdown`
- HTML: `.html`、`.htm`
- HTTP 請求: `.http`、`.rest`
- Windows 登錄檔: `.reg`
- Java: `.class`（反編譯）
- 壓縮檔案: `.zip`、`.jar`、`.vsix`、`.rar`、`.7z`、`.tar`、`.tar.gz`、`.tgz`、`.apk`

## Markdown

整合 [Vditor](https://github.com/Vanessa219/vditor) 實現 Markdown 所見即所得編輯。**注意：此編輯器已不再積極維護。**

如需使用 VS Code 原生 Markdown 編輯器，請在 `settings.json` 中新增以下設定：

```json
{
    "workbench.editorAssociations": {
        "*.md": "default",
        "*.markdown": "default"
    }
}
```

在編輯器中按右鍵，可將 Markdown 匯出為 PDF、DOCX 或 HTML。PDF 匯出依賴 Chromium，可透過 `vscode-office.chromiumPath` 設定瀏覽器路徑。

![匯出 Markdown](image/README-CN/1685418034035.png)

快捷鍵：基於 [Vditor 快捷鍵](shortcut.md)，以及：

- 將清單上移一行: `Ctrl Alt I` / `⌘ ^ I`
- 將清單下移一行: `Ctrl Alt J` / `⌘ ^ J`
- 在 VS Code 中編輯: `Ctrl Alt E` / `⌘ ^ E`

提示：

- 可透過 Ctrl/Cmd + 滑鼠滾輪調整編輯器大小。
- 按住 Ctrl/Meta + 點擊或雙擊可開啟超連結。

## 其他功能

- HTML: 編輯時按下 `Ctrl+Shift+V` 可即時預覽
- Git 歷史: 在原始碼控制檢視或檔案右鍵選單中瀏覽提交圖、查看檔案歷史、對比修訂並執行常用 Git 操作
- YAML: 支援文件大綱與錨點導覽（別名引用可跳轉到定義）
- 圖示主題: 內建 [Material Icon Theme](https://github.com/PKief/vscode-material-icon-theme) 部分圖示，並提供 **Office Material Icon Theme** 與 **One Dark Modern** 配色主題
- Excel: 支援預覽與儲存 `.xlsx`、`.xls`、`.xlsm`、`.csv`、`.ods` 等檔案（注意儲存 `.xlsx` 可能遺失格式；`.csv` 不支援 GBK 編碼的中文）
- HTTP: 在 `.http`、`.rest` 檔案中傳送請求（整合自 [REST Client](https://github.com/Huachao/vscode-restclient)，並修正了本地請求的已知問題）；按 `Ctrl+Enter` / `⌘ Enter` 傳送
- Java: 開啟 `.class` 檔案可反編譯並查看原始碼

## Sponsor

[![Database Client](https://database-client.com/text_logo.png)](https://marketplace.visualstudio.com/items?itemName=cweijan.vscode-database-client2)

適用於 Visual Studio Code 的資料庫用戶端，支援 **MySQL/MariaDB、PostgreSQL、SQLite、Redis** 以及 **ElasticSearch** 等資料庫的管理，且可作為 SSH 用戶端，極大地提升您的生產力！[立刻安裝](https://marketplace.visualstudio.com/items?itemName=cweijan.vscode-database-client2)。

## Credits

- PDF rendering: [mozilla/pdf.js](https://github.com/mozilla/pdf.js/)
- DOCX rendering: [VolodymyrBaydalka/docxjs](https://github.com/VolodymyrBaydalka/docxjs)
- PPTX rendering: [pptxviewjs](https://www.npmjs.com/package/pptxviewjs)
- XLSX rendering:
  - [SheetJS/sheetjs](https://github.com/SheetJS/sheetjs): XLSX parsing
  - [myliang/x-spreadsheet](https://github.com/myliang/x-spreadsheet): XLSX rendering
- EPUB: [futurepress/epub.js](https://github.com/futurepress/epub.js)
- PSD: [ag-psd](https://github.com/Agamnentzar/ag-psd)
- XMind: [mind-elixir](https://github.com/ssshooter/mind-elixir-core), [@mind-elixir/import-xmind](https://github.com/ssshooter/mind-elixir-core)
- HEIC conversion: [heic2any](https://github.com/alexcorvi/heic2any)
- Java decompiler: [JetBrains/java-decompiler](https://github.com/JetBrains/intellij-community/tree/master/plugins/java-decompiler/engine)
- HTTP: [REST Client](https://github.com/Huachao/vscode-restclient)
- Markdown: [Vanessa219/vditor](https://github.com/Vanessa219/vditor)
- Material Icon theme: [PKief/vscode-material-icon-theme](https://github.com/PKief/vscode-material-icon-theme)
