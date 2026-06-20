import { openLink, hotKeys, imageParser, getToolbar, autoSymbol, onToolbarClick, createContextMenu, scrollEditor, setupEditorSession } from "./util.js";

let state;
function loadConfigs() {
  const elem = document.getElementById('configs')
  try {
    state = JSON.parse(elem.getAttribute('data-config'));
    const { platform } = state;
    document.getElementById('vditor').classList.add(platform)
  } catch (error) {
    console.log('loadConfigFail')
  }
  return state;
}
loadConfigs()

const CODE_MIRROR_THEMES = new Set([
  'default', 'github', 'solarized-light', 'material-light', 'quiet-light', 'one-light',
  'dracula', 'monokai', 'one-dark', 'solarized-dark', 'material-dark',
])

function normalizeCodeMirrorTheme(theme) {
  return CODE_MIRROR_THEMES.has(theme) ? theme : 'default'
}

handler.on("open", async (md) => {
  const { config, language } = md;
  const sponsorBaseUrl = md.sponsorBaseUrl || state?.sponsorBaseUrl;
  const codeMirrorTheme = normalizeCodeMirrorTheme(md.codeMirrorTheme ?? config.codeMirrorTheme)
  const editorTheme = md.editorTheme ?? config.editorTheme ?? 'Auto'
  const editor = new Vditor('vditor', {
    value: md.content,
    cdn: md.rootPath,
    editorTheme,
    codeMirrorTheme,
    preventMacOptionKey: config.preventMacOptionKey !== false,
    height: '100%',
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
    tab: '\t',
    preview: {
      theme: {
        path: `${md.rootPath}/css/content-theme`
      },
      hljs: {
        style: codeMirrorTheme,
      },
      markdown: {
        toc: true,
        codeBlockPreview: config.previewCode,
      },
      extPath: md.rootPath,
      math: {
        inlineDigit: true
      }
    },
    toolbar: await getToolbar(md.rootPath, sponsorBaseUrl, language),
    extPath: md.rootPath,
    changeEditorTheme(theme) {
      handler.emit('editorTheme', theme)
    },
    changeCodeTheme(theme) {
      handler.emit('codeMirrorTheme', theme)
    },
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
      setupEditorSession()
      scrollEditor(md.scrollTop)
    }
  })
  autoSymbol(handler, editor, config);
  createContextMenu(editor)
  imageParser(config.viewAbsoluteLocal)
  zoomElement('.vditor-content')
}).emit("init")
