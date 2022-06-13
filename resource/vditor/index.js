import { openLink, hotKeys, imageParser, toolbar, autoSymbal, onToolbarClick, createContextMenu } from "./util.js";

handler.on("open", (md) => {
  const config = md.config;
  if (config.autoTheme) {
    // window.addThemeCss()
  }
  const editor = new Vditor('vditor', {
    value: md.content,
    _lutePath: md.rootPath + '/lute.min.js',
    height: document.documentElement.clientHeight,
    outline: {
      enable: config.openOutline,
      position: 'left',
    },
    mode: 'wysiwyg',
    icon: "material",
    tab: '\t',
    preview: {
      theme: {
        path: `${md.rootPath}/css/content-theme`
      },
      markdown: {
        toc: true
      },
      hljs: {
        style: 'dracula'
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
  autoSymbal(editor);
  createContextMenu(editor)
  imageParser(config.viewAbsoluteLocal)
}).emit("init")