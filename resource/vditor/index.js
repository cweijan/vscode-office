import { openLink, hotKeys, imageParser, toolbar, autoSymbal, onToolbarClick, createContextMenu } from "./util.js";

handler.on("open", (md) => {
  const config = md.config;
  if (config.autoTheme) {
    addAutoTheme()
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
        toc: true,
        codeBlockPreview: config.previewCode,
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


function addAutoTheme(){
  const css=`
* {
  border-color: var(--vscode-quickInputTitle-background) !important;
}

body[data-vscode-theme-kind="vscode-light"] .vditor-content hr{
  background-color: var(--vscode-panel-border) !important;
}

body[data-vscode-theme-kind="vscode-dark"] .vditor-content hr{
  background-color: var(--vscode-panel-border) !important;
}

.vditor-input{
  border:  1px solid var(--vscode-quickInputTitle-background);
}

.vditor-toolbar {
  background-color: var(--vscode-editor-background);
}

.vditor-toolbar__item .vditor-tooltipped {
  color: var(--vscode-editor-foreground)
}


.vditor-content code:not(.hljs) {
  background-color: #2E2E2E !important;
}

.vditor-content,
.vditor-content *:not(.hljs, .hljs *, a) {
  background-color: var(--vscode-editor-background) !important;
  color: var(--vscode-editor-foreground) !important;
}

.vditor-hint button:not(.vditor-menu--disabled):hover{
  background-color: var(--vscode-editorSuggestWidget-background) !important;
}
.vditor-content .vditor-outline li > span >span:hover {
  color: var(--vscode-terminal-ansiBlue) !important;
}
`
  const style = document.createElement('style');
  style.innerText = css;
  document.documentElement.appendChild(style)
}