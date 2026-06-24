import { openLink, hotKeys, imageParser, getToolbar, autoSymbol, createContextMenu, setAIAvailable } from "./util.js";
import { mapVscodeLanguageToVditorLang } from "./lang.js";

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
    toolbar: await getToolbar(rootPath, isDev, () => handler.emit('doSave', editor?.getValue())),
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
      },
      onCancelPolish() {
        handler.emit('aiPolishCancel')
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
        if (document.querySelector("[data-type='yaml-front-matter'].vditor-code-block--cm .cm-editor.cm-focused")) {
          return;
        }
        if (editor.getValue() === content) {
          return;
        }
        editor.setValue(content);
      })
      handler.emit('queryAIAvailable')
      handler.on("aiAvailable", (available) => {
        setAIAvailable(available, isDev)
      })
      openLink()
      editor.restoreDocumentSession(true)
    }
  })
  autoSymbol(handler, editor);
  createContextMenu(editor)
  imageParser(viewAbsoluteLocal)
}).emit("init")
