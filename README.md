# vscode-office

[中文文档](README-CN.md)

This extension supports previewing these common office file formats.

- Excel: .xls, .xlsx, .csv
- Svg: .svg
- Pdf: .pdf
- Font: .ttf, .otf, .woff
- Markdown: .md
- HttpRequest: .http
- PlantUml: .puml, .plantuml
- Windows Reg: .reg

## Markdown

This extension changes the default markdown editor to the excellent vditor:

- A WYSIWYG editor for markdown.
- Which provides export to pdf (via right click in the document tab).

If you want the editor to follow the theme, you can turn on this configuration

```json
{
    "vscode-office.autoTheme": true
}
```

If you want to use the original vscode editor, insert this in your `settings.json`.

```json
{
    "workbench.editorAssociations": {
        "*.md": "default"
    }
}
```

## HTML

The html editor supports live viewing.   Press ctrl+shift+v to open the live view.
