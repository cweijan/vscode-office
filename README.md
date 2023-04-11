# vscode-office

[中文说明](README-CN.md)

This extension supports previewing these common office file formats.

- Excel: .xls, .xlsx, .csv
- Word: .docx
- Svg: .svg
- Pdf: .pdf
- Font: .ttf, .otf, .woff
- Markdown: .md
- HttpRequest: .http
- Windows Reg: .reg

If it helps you, consider star this repository (●'◡'●).

## Markdown

This extension changes the default markdown editor to the excellent vditor:

- A WYSIWYG editor for markdown.
- Which provides export to pdf, html or contextmenu(via right click in the document).

If you want to use the original vscode editor, insert this in your `settings.json`.

```json
{
    "workbench.editorAssociations": {
        "*.md": "default"
    }
}
```

Usages:

- Resize editor via ctrl/meta+mouse scroll.
- Hyperlinks can be opened by ctrl/meta+click or double-click.

## HTML

The html editor supports live viewing.   Press ctrl+shift+v to open the live view.

## Credits

- PDF rendering: [mozilla/pdf.js/](https://github.com/mozilla/pdf.js/)
- Docx rendering: [VolodymyrBaydalka/docxjs](https://github.com/VolodymyrBaydalka/docxjs)
- XLSX rendering:
  - [SheetJS/sheetjs](https://github.com/SheetJS/sheetjs): XLSX parsing
  - [myliang/x-spreadsheet](https://github.com/myliang/x-spreadsheet): XLSX rendering
- HTTP: [Rest  Client](https://github.com/Huachao/vscode-restclient)
- Markdown: [Vanessa219/vditor](https://github.com/Vanessa219/vditor)
- Material Icon theme: [PKief/vscode-material-icon-theme](https://github.com/PKief/vscode-material-icon-theme)
