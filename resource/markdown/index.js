import { openLink, hotKeys, imageParser, getToolbar, autoSymbol, createContextMenu, scrollEditor, setupEditorSession } from "./util.js";

function buildFocusCacheId(documentPath) {
  if (!documentPath) {
    return undefined;
  }
  return `md-${documentPath}`;
}

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
  'Auto', 'default',
  'Github', 'Solarized Light', 'Material Light', 'Quiet Light', 'One Light',
  'Dracula', 'Monokai', 'One Dark', 'Solarized Dark', 'Material Dark',
])

function normalizeCodeMirrorTheme(theme) {
  if (theme === 'default') {
    return 'Auto'
  }
  return CODE_MIRROR_THEMES.has(theme) ? theme : 'Auto'
}

function normalizeEditMode(mode) {
  if (mode === 'sv') {
    return 'ir'
  }
  return mode === 'ir' ? 'ir' : 'wysiwyg'
}

handler.on("open", async (md) => {
  const { config, language } = md;
  const codeMirrorTheme = normalizeCodeMirrorTheme(md.codeMirrorTheme ?? config.codeMirrorTheme)
  const editorTheme = md.editorTheme ?? config.editorTheme ?? 'Auto'
  const mermaidTheme = md.mermaidTheme ?? config.mermaidTheme ?? 'Auto'
  const editMode = normalizeEditMode(md.editMode ?? config.editMode)
  const editor = new Vditor('vditor', {
    value: md.content,
    cdn: md.rootPath,
    editorTheme,
    codeMirrorTheme,
    mermaidTheme,
    height: '100%',
    outline: {
      enable: config.openOutline,
      position: 'left',
      change: (enable) => handler.emit("saveOutline", enable),
    },
    toolbarConfig: {
      hide: config.hideToolbar
    },
    cache: {
      enable: false,
      id: buildFocusCacheId(md.documentPath),
      focusHost: 'vscode',
    },
    mode: editMode,
    lang: language == 'zh-cn' ? 'zh_CN' : config.editorLanguage,
    tab: '\t',
    toolbar: await getToolbar(md.rootPath, language),
    onAboutOpen: () => handler.emit('openAbout'),
    onSponsorLogoClick: () => handler.emit('openSponsor'),
    onSponsorSiteClick: () => handler.emit('openExternal', 'https://database-client.com/'),
    debugger: md.isDev,
    extPath: md.rootPath,
    changeEditorTheme(theme) {
      handler.emit('editorTheme', theme)
    },
    changeCodeTheme(theme) {
      handler.emit('codeMirrorTheme', theme)
    },
    changeMermaidTheme(theme) {
      handler.emit('mermaidTheme', theme)
    },
    changeEditMode(mode) {
      handler.emit('editMode', mode)
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
      extend: hotKeys
    },
    preview: {
      math: {
        inlineDigit: true,
        macros: config.markdown?.math?.macros ?? {},
      },
    },
    after() {
      handler.on("update", content => {
        editor.setValue(content);
      })
      openLink()
      setupEditorSession(editor)
      scrollEditor(md.scrollTop, editor)
      editor.restoreFocus(true)
    }
  })
  autoSymbol(handler, editor, config);
  createContextMenu(editor)
  imageParser(config.viewAbsoluteLocal)
  zoomElement('.vditor-reset')
}).emit("init")
