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

const RTL_CHAR_RE = /[\u0590-\u08FF\uFB1D-\uFEFC]/
const LTR_CHAR_RE = /[A-Za-z\u0400-\u052F]/
const DIRECTION_BLOCK_SELECTOR = [
  '#vditor .vditor-reset p',
  '#vditor .vditor-reset li',
  '#vditor .vditor-reset blockquote',
  '#vditor .vditor-reset th',
  '#vditor .vditor-reset td',
  '#vditor .vditor-reset h1',
  '#vditor .vditor-reset h2',
  '#vditor .vditor-reset h3',
  '#vditor .vditor-reset h4',
  '#vditor .vditor-reset h5',
  '#vditor .vditor-reset h6',
  '#vditor .vditor-wysiwyg__block',
  '#vditor .vditor-ir__node',
  '#vditor [data-type="NodeParagraph"]',
  '#vditor [data-type="NodeHeading"]',
  '#vditor [data-type="NodeListItem"]',
  '#vditor [data-type="NodeBlockquote"]',
].join(',')
const DIRECTION_LIST_SELECTOR = [
  '#vditor .vditor-reset ul',
  '#vditor .vditor-reset ol',
  '#vditor [data-type="NodeList"]',
].join(',')

let directionObserver

function firstStrongDirection(text) {
  for (const char of text.trim()) {
    if (RTL_CHAR_RE.test(char)) {
      return 'rtl'
    }
    if (LTR_CHAR_RE.test(char)) {
      return 'ltr'
    }
  }
  return 'ltr'
}

function setDirection(element, direction) {
  element.classList.toggle('rtl-lang', direction === 'rtl')
  element.setAttribute('dir', direction)
}

function updateTextDirections() {
  const target = document.getElementById('vditor')
  if (!target) {
    return
  }
  target.querySelectorAll(DIRECTION_BLOCK_SELECTOR).forEach((element) => {
    if (!element.closest('pre, code, .katex, .vditor-mermaid-host')) {
      setDirection(element, firstStrongDirection(element.textContent || ''))
    }
  })
  target.querySelectorAll(DIRECTION_LIST_SELECTOR).forEach((list) => {
    if (!list.closest('pre, code, .katex, .vditor-mermaid-host')) {
      setDirection(list, list.querySelector('.rtl-lang') ? 'rtl' : firstStrongDirection(list.textContent || ''))
    }
  })
}

function scheduleTextDirections() {
  requestAnimationFrame(updateTextDirections)
  setTimeout(updateTextDirections, 100)
  setTimeout(updateTextDirections, 500)
}

function watchTextDirections() {
  const target = document.getElementById('vditor')
  if (!target) {
    return
  }
  directionObserver?.disconnect()
  scheduleTextDirections()
  directionObserver = new MutationObserver(scheduleTextDirections)
  directionObserver.observe(target, { childList: true, characterData: true, subtree: true })
}

document.addEventListener('DOMContentLoaded', watchTextDirections)

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
        scheduleTextDirections()
      })
      openLink()
      editor.restoreDocumentSession(true)
      watchTextDirections()
    }
  })
  autoSymbol(handler, editor, config);
  createContextMenu(editor)
  imageParser(config.viewAbsoluteLocal)
  zoomElement('.vditor-reset')
}).emit("init")
