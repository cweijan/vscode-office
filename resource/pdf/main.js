"use strict";

(function () {
  function cursorTools(name) {
    // hand表示可以通过手指上下滑动, 0则可以选择文本
    return name === 'hand' ? 1 : 0
  }
  function scrollMode(name) {
    switch (name) {
      case 'vertical':
        return 0
      case 'horizontal':
        return 1
      case 'wrapped':
        return 2
      default:
        return -1
    }
  }
  function spreadMode(name) {
    switch (name) {
      case 'none':
        return 0
      case 'odd':
        return 1
      case 'even':
        return 2
      default:
        return -1
    }
  }
  function setupDarkMode() {
    const STORAGE_KEY = 'office-pdf-dark-mode';
    const apply = (on) => {
      document.body.classList.toggle('office-dark', on);
      const btn = document.getElementById('darkModeToggle');
      if (btn) btn.classList.toggle('toggled', on);
    };
    let enabled = false;
    try { enabled = localStorage.getItem(STORAGE_KEY) === '1'; } catch (e) { }
    apply(enabled);
    const toggle = () => {
      enabled = !enabled;
      try { localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0'); } catch (e) { }
      apply(enabled);
    };
    const btn = document.getElementById('darkModeToggle');
    if (btn) btn.addEventListener('click', toggle);
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        toggle();
      }
    });
  }

  window.addEventListener('load', function () {
    setupDarkMode();
    PDFViewerApplication.initializedPromise.then(() => {
      const optsOnLoad = () => {
        PDFViewerApplication.pdfCursorTools.switchTool(cursorTools('select'))
        PDFViewerApplication.pdfViewer.scrollMode = scrollMode('vertical')
        PDFViewerApplication.pdfViewer.spreadMode = spreadMode('none')
        if (window.innerWidth > 900) {
          PDFViewerApplication.pdfSidebar.open()
        }
        PDFViewerApplication.eventBus.off('documentloaded', optsOnLoad)
      }
      PDFViewerApplication.eventBus.on('documentloaded', optsOnLoad)
    })
    vscodeEvent.on("open", ({ path }) => {
      PDFViewerApplication.open(path)
    })
    vscodeEvent.emit("init")
  }, { once: true });
}());
