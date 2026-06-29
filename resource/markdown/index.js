import { getToolbar, bindShortcut, createContextMenu, setAIAvailable, openToolbarExport } from "./util.js";
import { mapVscodeLanguageToVditorLang } from "./lang.js";
import { refreshExportDialogProState } from "./exportDialog.js";

const removeLockedDecorations = (root) => {
  root?.querySelectorAll?.('.vditor-pro-locked__badge, .vditor-pro-locked__tooltip').forEach((node) => node.remove());
  root?.querySelectorAll?.('.vditor-pro-locked').forEach((node) => node.classList.remove('vditor-pro-locked'));
};

const hideToolbarEntry = (root, type) => {
  const item = root?.querySelector?.(`.vditor-toolbar [data-type="${type}"]`)?.closest('.vditor-toolbar__item');
  if (item) item.hidden = true;
};

const showToolbarEntry = (root, type) => {
  const item = root?.querySelector?.(`.vditor-toolbar [data-type="${type}"]`)?.closest('.vditor-toolbar__item');
  if (item) item.hidden = false;
};

const applyProState = (editor, isPro) => {
  document.body.classList.toggle('is-pro', !!isPro);
  if (!editor?.vditor?.options) {
    refreshExportDialogProState();
    return;
  }

  editor.vditor.options.isPro = !!isPro;
  if (editor.options) {
    editor.options.isPro = !!isPro;
  }

  if (isPro) {
    removeLockedDecorations(document);
    hideToolbarEntry(document, 'pro-upgrade');
    hideToolbarEntry(document, 'help');
  } else {
    showToolbarEntry(document, 'pro-upgrade');
    showToolbarEntry(document, 'help');
  }

  refreshExportDialogProState();
};

handler.on("open", async (md) => {
  const { content, rootPath, documentCacheId, pendingFragment, config } = md;
  const {
    language, isWeb, isDev, isPro, markdown,
    editMode, editorTheme, codeMirrorTheme, mermaidTheme
  } = config;
  if (isWeb) {
    document.body.classList.add('is-web')
  }
  applyProState(null, isPro)
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
    isPro,
    onRequirePro() {
      handler.emit('openProPanel')
    },
    lang: mapVscodeLanguageToVditorLang(language),
    tab: '\t',
    toolbar: await getToolbar(rootPath, () => {
      handler.emit('doSave', editor?.getValue());
      editor?.markSaved();
    }, isPro, () => openToolbarExport(editor)),
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
      handler.on('markdownConfig', (update) => {
        if (update.editorTheme !== undefined) {
          editor.setEditorTheme(update.editorTheme);
        }
        if (update.codeMirrorTheme !== undefined) {
          Vditor.setCodeTheme(update.codeMirrorTheme, editor.vditor?.element);
        }
        if (update.mermaidTheme !== undefined) {
          editor.setMermaidTheme(update.mermaidTheme);
        }
        if (update.editMode !== undefined) {
          editor.switchEditMode(update.editMode);
        }
      });
      handler.on('markdownProStatus', ({ isPro }) => {
        applyProState(editor, !!isPro);
        if (!isPro) {
          // Clear badge dismissed state so the dot reappears
          localStorage.removeItem('office.pro.badgeDismissed');
          // Re-inject badge dot into DOM if button is visible and dot was removed
          const btn = document.querySelector('.vditor-toolbar [data-type="pro-upgrade"]');
          if (btn && !btn.querySelector('.vditor-pro-badge')) {
            const dot = document.createElement('span');
            dot.className = 'vditor-pro-badge';
            btn.appendChild(dot);
          }
        }
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
}).emit("init")
