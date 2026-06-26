import { imageParser, getToolbar, bindShortcut, createContextMenu, setAIAvailable } from "./util.js";
import { mapVscodeLanguageToVditorLang } from "./lang.js";

handler.on("open", async (md) => {
  const { content, rootPath, documentCacheId, pendingFragment, config } = md;
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
    toolbar: await getToolbar(rootPath, () => {
      handler.emit('doSave', editor?.getValue());
      editor?.markSaved();
    }),
    onAboutOpen: () => handler.emit('openAbout'),
    onSponsorLogoClick: () => handler.emit('openSponsor'),
    onSponsorSiteClick: () => handler.emit('openExternal', 'https://database-client.com/'),
    onLinkClick(payload, event) {
      const isCompose = event.metaKey || event.ctrlKey;
      if (payload.action !== "dblclick" && !(payload.action === "click" && isCompose)) {
        return;
      }
      let uri = payload.href;
      if (payload.type === "wikilink" || payload.type === "wikilink-embed") {
        const hashIndex = uri.indexOf("#");
        const page = hashIndex < 0 ? uri : uri.slice(0, hashIndex);
        const fragment = hashIndex < 0 ? "" : uri.slice(hashIndex + 1);
        if (!page && fragment) {
          editor.scrollToBlock(fragment);
          return;
        }
        uri = `wiki:${payload.href}`;
      }
      handler.emit("openLink", uri);
    },
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
    onSettingsChange(settings) {
      handler.emit('syncViewerSettings', settings)
    },
    onEditSettings() {
      handler.emit('editViewerSettings', editor.exportViewerSettings())
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
    onTelemetry(event, properties) {
      handler.emit('telemetry', { event, properties });
    },
    ai: {
      onPolish(markdown, apply, options) {
        handler.emit('aiPolish', { markdown, options })
        handler.on('aiPolishChunk', (chunk) => {
          editor.streamAIChunk(chunk)
        })
        handler.on('aiPolishEnd', () => {
          editor.endAIStream()
        })
      },
      onCancelPolish() {
        handler.emit('aiPolishCancel')
      }
    },
    preview: {
      math: {
        macros: markdown?.math?.macros ?? {},
      },
    },
    after() {
      const { viewerSettings } = md;
      if (viewerSettings?.enabled) {
        editor.setViewerSettingsSyncEnabled(true);
        if (viewerSettings.settings) {
          editor.applyViewerSettings(viewerSettings.settings);
        }
      }
      handler.on('viewerSettingsSync', ({ enabled }) => {
        editor.setViewerSettingsSyncEnabled(!!enabled);
      });
      handler.on('viewerSettings', (settings) => {
        editor.applyViewerSettings(settings);
      });
      handler.on("update", content => {
        if (document.querySelector("[data-type='yaml-front-matter'].vditor-code-block--cm .cm-editor.cm-focused")) {
          return;
        }
        if (editor.getValue() === content) {
          return;
        }
        editor.setValue(content);
        editor.markSaved();
      })
      handler.on("gotoBlock", (fragment) => {
        if (fragment) {
          editor.scrollToBlock(fragment);
        }
      })
      handler.emit('queryAIAvailable')
      handler.on("aiAvailable", (available) => {
        setAIAvailable(available, editor)
        if (available) {
          handler.emit('queryVSCodeModels')
        }
      })
      handler.on("vscodeModels", (models) => {
        editor.setVSCodeModels(models)
      })
      editor.restoreDocumentSession(true)
      if (pendingFragment) {
        editor.scrollToBlock(pendingFragment);
      }
    }
  })
  bindShortcut(handler, editor);
  createContextMenu(editor)
  imageParser(viewAbsoluteLocal)
}).emit("init")
