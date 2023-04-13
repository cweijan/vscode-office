import { openLink, hotKeys, imageParser, toolbar, autoSymbal, onToolbarClick, createContextMenu, scrollEditor } from "./util.js";

handler.on("open", (md) => {
  const { config, language } = md;
  if (config.autoTheme) {
    addAutoTheme(md.rootPath)
  }
  const editor = new Vditor('vditor', {
    value: md.content,
    _lutePath: md.rootPath + '/lute.min.js',
    cdn: 'https://unpkg.com/vscode-vditor@3.8.18',
    height: document.documentElement.clientHeight,
    outline: {
      enable: config.openOutline,
      position: 'left',
    },
    toolbarConfig: {
      hide: config.hideToolbar
    },
    cache: {
      enable: false,
    },
    mode: 'wysiwyg',
    lang: language == 'zh-cn' ? 'zh_CN' : config.editorLanguage,
    icon: "material",
    tab: '\t',
    preview: {
      theme: {
        path: `${md.rootPath}/css/content-theme`
      },
      markdown: {
        toc: true,
        codeBlockPreview: config.previewCode,
      },
      hljs: {
        style: config.previewCodeHighlight.style,
        lineNumber: config.previewCodeHighlight.showLineNumber
      },
      extPath: md.rootPath,
      math: {
        engine: 'KaTeX',
        "inlineDigit": true
      }
    },
    toolbar,
    extPath: md.rootPath,
    input(content) {
      handler.emit("save", content)
    },
    upload: {
      url: '/image',
      accept: 'image/*',
      handler(files) {
        let reader = new FileReader();
        reader.readAsBinaryString(files[0]);
        reader.onloadend = () => {
          handler.emit("img", reader.result)
        };
      }
    },
    hint: {
      emoji: {},
      extend: hotKeys
    }, after() {
      handler.on("update", content => {
        editor.setValue(content);
      })
      openLink()
      onToolbarClick(editor)
    }
  })
  autoSymbal(handler,editor);
  createContextMenu(editor)
  imageParser(config.viewAbsoluteLocal)
  scrollEditor(md.scrollTop)
  zoomElement('.vditor-content')
}).emit("init")


function addAutoTheme(rootPath) {
  const style = document.createElement('link');
  style.rel = "stylesheet";
  style.type = "text/css";
  style.href = `${rootPath}/css/theme.css`;
  document.documentElement.appendChild(style)
}