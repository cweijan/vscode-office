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
- Font: .ttf, .otf, .woff
- Markdown: .md
- HttpRequest: .http
- PlantUml: .puml, .plantuml
- Windows Reg: .reg

# Markdown

This extension change default editor for markdown:

1. It change markdown editor as vditor, it's WYSIWYG editor for markdown.
2. Support export markdown to pdf, right click editor found it.

if you want using vscode editor, insert below json to vscode config.

```json
"workbench.editorAssociations": [{
	"viewType": "default",
	"filenamePattern": "*.md"
}]
```

shortcut:

- ctrl+shift+i: move line up.
- ctrl+shift+j: move line down.
- ctrl+k: toggle bold.

# HTML

In html editor, Press ctrl+shift+v open live edit for html.

# Credit

- Excel
  - [sheetjs](https://github.com/SheetJS/sheetjs)
  - [x-spreadsheet](https://github.com/myliang/x-spreadsheet)
- PhotoShop
  - [psd.js](https://github.com/meltingice/psd.js)
  - [psd-viewer](https://github.com/zenoamaro/psd-viewer)
- Word: [mammoth](https://github.com/mwilliamson/mammoth.js)
- xmind: [xmind-viewer](https://github.com/xmindltd/xmind-viewer)
- Image: [lightGallery](https://github.com/sachinchoolur/lightGallery)
- Flash: [swf2js](https://github.com/swf2js/swf2js)
- PDF:
  - [pdf.js](https://github.com/mozilla/pdf.js)
  - [pdf-lib](https://github.com/Hopding/pdf-lib)
  - [puppeteer](https://github.com/puppeteer/puppeteer)
- Font:
  - [CharacterMap](https://github.com/mathew-kurian/CharacterMap)
  - [opentype](https://github.com/opentypejs/opentype.js)
- HTTP: [vscode-restclient](https://github.com/Huachao/vscode-restclient)
- Markdown:
  - [vditor](https://github.com/Vanessa219/vditor)
  - [HyperMD](https://github.com/laobubu/HyperMD)
  - [CodeMirror](https://github.com/codemirror/CodeMirror)
- PlantUml:
  - [plantuml-editor](https://github.com/kkeisuke/plantuml-editor)
  - [plantuml-server](https://plantuml.com/)
- Epub:
  - [epub.js](https://github.com/futurepress/epub.js/)
  - [ePubViewer](https://github.com/pgaskin/ePubViewer)
- Reg: [reg-vscode](https://github.com/ionutvmi/reg-vscode)
