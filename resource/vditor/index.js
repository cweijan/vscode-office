import { openLink, hotKeys, imageParser, getToolbar, autoSymbol, onToolbarClick, createContextMenu, scrollEditor, setupEditorSession, initThemeToggle, updateThemeToggle } from "./util.js";

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
  addAutoTheme(md.rootPath, config.editorTheme)
  initThemeToggle(config.editorTheme)
  handler.on('theme', theme => {
    loadTheme(md.rootPath, theme)
  })
  const codeMirrorTheme = normalizeCodeMirrorTheme(md.codeMirrorTheme ?? config.codeMirrorTheme)
  const editor = new Vditor('vditor', {
    value: md.content,
    cdn: md.rootPath,
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
    // icon: "material",
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
      syncVditorDarkClass(config.editorTheme)
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


const DARK_EDITOR_THEMES = new Set(['One Dark', 'Github Dark', 'Nord', 'Monokai', 'Dracula'])

function addAutoTheme(rootPath, theme) {
  loadCSS(rootPath, 'base.css')
  loadCodeMirrorCSS(rootPath)
  loadTheme(rootPath, theme)
  observeVscodeTheme()
}

function isVscodeDarkTheme() {
  const kind = document.body.getAttribute('data-vscode-theme-kind')
  if (kind === 'vscode-dark' || kind === 'vscode-high-contrast') return true
  if (kind === 'vscode-light' || kind === 'vscode-high-contrast-light') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function syncVditorDarkClass(theme) {
  const vditor = document.getElementById('vditor')
  if (!vditor) return
  const useDark = theme === 'Auto' ? isVscodeDarkTheme() : DARK_EDITOR_THEMES.has(theme)
  vditor.classList.toggle('vditor--dark', useDark)
}

function observeVscodeTheme() {
  if (observeVscodeTheme.started) return
  observeVscodeTheme.started = true
  const observer = new MutationObserver(() => {
    const theme = document.getElementById('vditor')?.getAttribute('data-editor-theme')
    if (theme === 'Auto') syncVditorDarkClass('Auto')
  })
  observer.observe(document.body, { attributes: true, attributeFilter: ['data-vscode-theme-kind'] })
}

function loadTheme(rootPath, theme) {
  loadCSS(rootPath, `theme/${theme}.css`)
  document.getElementById('vditor').setAttribute('data-editor-theme', theme)
  syncVditorDarkClass(theme)
  updateThemeToggle(theme)
}

function loadCodeMirrorCSS(rootPath) {
  if (loadCodeMirrorCSS.loaded) return
  loadCodeMirrorCSS.loaded = true
  loadCSS(rootPath, 'codemirror.css')
}

function loadCSS(rootPath, path) {
  const style = document.createElement('link');
  style.rel = "stylesheet";
  style.type = "text/css";
  style.href = `${rootPath}/css/${path}`;
  document.documentElement.appendChild(style)
}