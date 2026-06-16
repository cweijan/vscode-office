"use strict";

(function () {
  const SIDEBAR_WIDTH_VAR = '--sidebar-width';
  const SIDEBAR_MIN_WIDTH = 200;
  const SIDEBAR_DEFAULT_WIDTH = 270;
  const SIDEBAR_STORAGE_KEY = 'vscode-office.pdf.sidebarWidth';

  function loadSidebarWidth() {
    try {
      const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (!saved) {
        return null;
      }
      const width = parseInt(saved, 10);
      return Number.isFinite(width) ? width : null;
    } catch {
      return null;
    }
  }

  function saveSidebarWidth(width) {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(width));
    } catch {
      // ignore storage errors
    }
  }

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
  const SUN_ICON = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 1a4 4 0 1 1 0-8 4 4 0 0 1 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zm8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zm10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0zm-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 1 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708z"/></svg>';

  const MOON_ICON = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z"/></svg>';

  function setupDarkMode() {
    const STORAGE_KEY = 'office-pdf-dark-mode';
    const apply = (on) => {
      document.body.classList.toggle('office-dark', on);
      const btn = document.getElementById('darkModeToggle');
      if (btn) {
        btn.classList.toggle('toggled', on);
        btn.innerHTML = on ? SUN_ICON : MOON_ICON;
        btn.title = on ? '切换亮色模式 (Ctrl/Cmd+L)' : '切换暗色模式 (Ctrl/Cmd+L)';
        btn.setAttribute('aria-label', btn.title);
      }
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
    })
  }

  function getSidebarWidth() {
    const value = getComputedStyle(document.documentElement).getPropertyValue(SIDEBAR_WIDTH_VAR).trim();
    const width = parseInt(value, 10);
    return Number.isFinite(width) ? width : SIDEBAR_DEFAULT_WIDTH;
  }

  function setSidebarWidth(width, persist = false) {
    const outerContainer = document.getElementById('outerContainer');
    if (!outerContainer) {
      return;
    }
    const maxWidth = Math.max(SIDEBAR_MIN_WIDTH, Math.floor(outerContainer.clientWidth / 2));
    const nextWidth = Math.min(Math.max(width, SIDEBAR_MIN_WIDTH), maxWidth);
    document.documentElement.style.setProperty(SIDEBAR_WIDTH_VAR, `${nextWidth}px`);
    if (persist) {
      saveSidebarWidth(nextWidth);
    }
    if (window.PDFViewerApplication?.eventBus) {
      PDFViewerApplication.eventBus.dispatch('resize', { source: window });
    }
    return nextWidth;
  }

  function restoreSidebarWidth() {
    const saved = loadSidebarWidth();
    if (saved != null) {
      setSidebarWidth(saved);
    }
  }

  function initSidebarResize() {
    const resizer = document.getElementById('sidebarResizer');
    const outerContainer = document.getElementById('outerContainer');
    if (!resizer || !outerContainer) {
      return;
    }

    resizer.classList.remove('hidden');
    restoreSidebarWidth();

    let dragging = false;
    let startX = 0;
    let startWidth = 0;
    let isRTL = false;
    let activePointerId = null;

    const onPointerMove = (event) => {
      if (!dragging) {
        return;
      }
      let nextWidth = startWidth + (event.clientX - startX);
      if (isRTL) {
        nextWidth = startWidth - (event.clientX - startX);
      }
      setSidebarWidth(nextWidth);
    };

    const endDrag = () => {
      if (!dragging) {
        return;
      }
      dragging = false;
      outerContainer.classList.remove('sidebarResizing');
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', endDrag);
      window.removeEventListener('pointercancel', endDrag);
      window.removeEventListener('blur', endDrag);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (activePointerId != null) {
        try {
          resizer.releasePointerCapture(activePointerId);
        } catch {
          // ignore
        }
        activePointerId = null;
      }
      setSidebarWidth(getSidebarWidth(), true);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        endDrag();
      }
    };

    resizer.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || dragging) {
        return;
      }
      event.preventDefault();
      dragging = true;
      isRTL = document.documentElement.dir === 'rtl';
      startX = event.clientX;
      startWidth = getSidebarWidth();
      activePointerId = event.pointerId;
      outerContainer.classList.add('sidebarResizing');
      try {
        resizer.setPointerCapture(event.pointerId);
      } catch {
        // ignore
      }
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', endDrag);
      window.addEventListener('pointercancel', endDrag);
      window.addEventListener('blur', endDrag);
      document.addEventListener('visibilitychange', onVisibilityChange);
    });
  }

  window.addEventListener('load', function () {
    setupDarkMode();
    PDFViewerApplication.initializedPromise.then(() => {
      initSidebarResize();
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
