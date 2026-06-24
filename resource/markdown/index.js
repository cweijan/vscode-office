import { openLink, hotKeys, imageParser, getToolbar, autoSymbol, createContextMenu, createAIDialog, setAIAvailable } from "./util.js";
import { mapVscodeLanguageToVditorLang } from "./lang.js";
import { getAII18n } from "./ai-i18n.js";

handler.on("open", async (md) => {
  const { content, rootPath, documentCacheId, config } = md;
  const {
    language, isWeb, isDev,
    markdown, viewAbsoluteLocal,
    editMode, editorTheme, codeMirrorTheme, mermaidTheme
  } = config;
  if (isWeb) {
    document.body.classList.add('is-web')
  }
  const editor = new Vditor('vditor', {
    value: content,
    cdn: rootPath,
    height: '100%',
    outline: {
      position: 'left',
    },
    cache: {
      enable: false,
      id: documentCacheId,
      focusHost: 'vscode',
    },
    mode: editMode,
    editorTheme,
    codeMirrorTheme,
    mermaidTheme,
    lang: mapVscodeLanguageToVditorLang(language),
    tab: '\t',
    toolbar: await getToolbar(rootPath),
    onAboutOpen: () => handler.emit('openAbout'),
    onSponsorLogoClick: () => handler.emit('openSponsor'),
    onSponsorSiteClick: () => handler.emit('openExternal', 'https://database-client.com/'),
    debugger: isDev,
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
    ai: {
      onPolish(markdown, apply, options) {
        handler.emit('aiPolish', { markdown, options })
        handler.on('aiPolishResult', (result) => {
          apply(result)
        })
      }
    },
    hint: {
      extend: hotKeys
    },
    preview: {
      math: {
        macros: markdown?.math?.macros ?? {},
      },
    },
    after() {
      handler.on("update", content => {
        editor.setValue(content);
      })
      handler.emit('queryAIAvailable')
      handler.on("aiAvailable", (available) => {
        setAIAvailable(available)
      })
      openLink()
      editor.restoreDocumentSession(true)
    }
  })
  autoSymbol(handler, editor);
  const aiT = getAII18n(mapVscodeLanguageToVditorLang(config.language))
  const aiDialog = createAIDialog((options) => editor.triggerAIPolish(options), aiT)
  createContextMenu(editor, aiDialog)
  imageParser(viewAbsoluteLocal)
}).emit("init")
