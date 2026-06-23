import { openLink, hotKeys, imageParser, getToolbar, autoSymbol, createContextMenu } from "./util.js";
import { mapVscodeLanguageToVditorLang } from "./lang.js";

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
      position: 'left',
    },
    cache: {
      enable: false,
      id: md.documentCacheId,
      focusHost: 'vscode',
    },
    mode: editMode,
    lang: mapVscodeLanguageToVditorLang(language),
    tab: '\t',
    toolbar: await getToolbar(md.rootPath),
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
        const file = files[0];
        const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
        let reader = new FileReader();
        reader.readAsBinaryString(file);
        reader.onloadend = () => {
          handler.emit("img", { data: reader.result, ext })
        };
      }
    },
    hint: {
      extend: hotKeys
    },
    preview: {
      math: {
        macros: config.markdown?.math?.macros ?? {},
      },
    },
    after() {
      handler.on("update", content => {
        editor.setValue(content);
      })
      openLink()
      editor.restoreDocumentSession(true)
    }
  })
  autoSymbol(handler, editor, config);
  createContextMenu(editor)
  imageParser(config.viewAbsoluteLocal)
  zoomElement('.vditor-reset')
}).emit("init")
