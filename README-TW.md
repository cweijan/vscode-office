# Office Viewer

## 介紹

該擴充套件在 VS Code 內整合 [Vditor](https://github.com/Vanessa219/vditor) (針對 VS Code 做了些相容性改動)，實現了對 Markdown 的所見即所得編輯，相比 Typora 的優缺點：

* 開源免費無廣告無隱私追蹤 (如果對你有幫助考慮點下 Star (●'◡'●))
* VS Code 內建 Git 支援，建立一個 Git 儲存庫就可以對 Markdown 進行版本管理
* 相比 Typora 的缺點: 對 HTML、程式碼區塊和圖形支援不友好

擴充套件名字叫做 Office Viewer 因為最初是為了增強 VSCode 的預覽功能，支援預覽 XLSX、DOCX、SVG、PDF、ZIP 等格式，後來才增加 Markdown 編輯器，同時為了精簡本人安裝的擴充套件，整合了一個圖示主題和顏色主題.

使用說明: [禁用方式看這裡](https://github.com/cweijan/vscode-office?tab=readme-ov-file#markdown)

* 編輯方式：直接透過 VS Code 開啟 `md` 檔案
* 配置 `vscode-office.autoTheme": false` 可將編輯器設定為亮白色
* 點選以下按鈕可開啟 VSCode 內建編輯器
  ![img](image/README-CN/1640579182342.png)
* 在編輯器開啟右鍵選單可將 Markdown 匯出為 PDF、DOCX 或者 HTML、PDF 依賴於 Chromium，可透過 `vscode-office.chromiumPath` 配置 Chromium 瀏覽器路徑
  ![1685418034035](image/README-CN/1685418034035.png)

快捷鍵: 基於[Vditor快捷鍵](https://ld246.com/article/1582778815353)以及更多:

- 將清單上移一行: `Ctrl Alt I` / `⌘ ^ I`
- 將清單下移一行: `Ctrl Alt J` / `⌘ ^ J`
- 在VS Code中編輯: `Ctrl Alt E` / `⌘ ^ E`

## 其他功能

* 圖示主題: 內建了 Material Icon Theme 部分 Icon
* Excel: 支援對 XLSX、CSV 等 Excel 檔案進行預覽和儲存 (注意 XLSX 儲存會丟失格式，CSV 則不支援 GBK 中文)
* HTML: 編輯 HTML 的過程中按下 Ctrl+Shift+V 可實時預覽
* PDF: 支援直接預覽 PDF 檔案
* HTTP: 用於傳送 HTTP 請求，由於 REST Client 本地請求有 bug，修改後進行整合

## Credits

* PDF rendering: [mozilla/pdf.js/](https://github.com/mozilla/pdf.js/)
* Docx rendering: [VolodymyrBaydalka/docxjs](https://github.com/VolodymyrBaydalka/docxjs)
* XLSX rendering:
  * [SheetJS/sheetjs](https://github.com/SheetJS/sheetjs): XLSX parsing
  * [myliang/x-spreadsheet](https://github.com/myliang/x-spreadsheet): XLSX rendering
* HTTP: [Rest Client](https://github.com/Huachao/vscode-restclient)
* Markdown: [Vanessa219/vditor](https://github.com/Vanessa219/vditor)
* Material Icon theme: [PKief/vscode-material-icon-theme](https://github.com/PKief/vscode-material-icon-theme)
