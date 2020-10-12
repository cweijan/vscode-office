# vscode-office

This extension is to support the function of previewing common office file formats.

It support below files now:
- Excel: .xls, .xlsx, .csv
- Word: .docx
- PhotoShop: .psd
- Svg: .svg
- Pdf: .pdf
- Epub: .epub
- Xmind: .xmind
- Markdown: .md
- PlantUml: .puml, .pu, .plantuml
- Windows Reg: .reg

# Markdown

This extension will change default markdown editor as hyperMD, if you want using vscode editor, insert below json to vscode config.
```json
"workbench.editorAssociations": [{
	"viewType": "default",
	"filenamePattern": "*.md"
}]
```

# Credit

- Excel
  - [sheetjs](https://github.com/SheetJS/sheetjs)
  - [x-spreadsheet](https://github.com/myliang/x-spreadsheet)
- PhotoShop
  - [psd.js](https://github.com/meltingice/psd.js)
  - [psd-viewer](https://github.com/zenoamaro/psd-viewer)
- Word: [mammoth](https://github.com/mwilliamson/mammoth.js)
- xmind: [xmind-viewer](https://github.com/xmindltd/xmind-viewer)
- PDF: [pdf.js](https://github.com/mozilla/pdf.js)
- Markdown:
  - [stackedit](https://github.com/benweet/stackedit)
  - [HyperMD](https://github.com/laobubu/HyperMD)
  - [CodeMirror](https://github.com/codemirror/CodeMirror)[
- PlantUml:
  - [plantuml-editor](https://github.com/kkeisuke/plantuml-editor)
  - [plantuml-server](https://plantuml.com/)
- Epub:
  - [epub.js](https://github.com/futurepress/epub.js/)
  - [ePubViewer](https://github.com/pgaskin/ePubViewer)
- Reg: [reg-vscode](https://github.com/ionutvmi/reg-vscode)
