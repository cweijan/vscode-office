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
  const ADAPTIVE_ICON = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"><path d="M13.2 6.8a5 5 0 1 0-8.5 4.2c.3.7 1.2 1.3 2.5 1.3.5 0 1-.1 1.5-.25"/><circle cx="5.75" cy="7" r=".65" fill="currentColor" stroke="none"/><circle cx="8" cy="5.5" r=".65" fill="currentColor" stroke="none"/><circle cx="10.25" cy="7.25" r=".65" fill="currentColor" stroke="none"/></svg>';

  const BULB_ICON = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2a3.5 3.5 0 0 0-1.5 6.7V12h3V8.7A3.5 3.5 0 0 0 8 2z"/><path d="M6.25 12h3.5M6.75 13.5h2.5"/></svg>';

  const MOON_ICON = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"><path d="M14 8.53A6 6 0 1 1 7.48 2 4.67 4.67 0 0 0 14 8.53z"/></svg>';

  const SUN_STROKE_ICON = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="2.75"/><path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M3.05 12.95l1.06-1.06M11.89 4.11l1.06-1.06"/></svg>';

  function setupThemeAdapt() {
    const STORAGE_KEY = 'office-pdf-adaptive-theme';
    const apply = (on) => {
      document.body.classList.toggle('office-adaptive-theme', on);
      const btn = document.getElementById('themeAdaptToggle');
      if (btn) {
        btn.classList.toggle('toggled', on);
        btn.innerHTML = on ? ADAPTIVE_ICON : SUN_STROKE_ICON;
        btn.title = on ? '使用默认亮色主题 (Ctrl/Cmd+Shift+L)' : '开启主题适配（跟随 VS Code 颜色）(Ctrl/Cmd+Shift+L)';
        btn.setAttribute('aria-label', on ? '使用默认亮色主题' : '开启主题适配');
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
    const btn = document.getElementById('themeAdaptToggle');
    if (btn) btn.addEventListener('click', toggle);
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && !e.altKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        toggle();
      }
    });
  }

  function setupDarkMode() {
    const STORAGE_KEY = 'office-pdf-dark-mode';
    const apply = (on) => {
      document.body.classList.toggle('office-dark', on);
      const btn = document.getElementById('darkModeToggle');
      if (btn) {
        btn.classList.toggle('toggled', on);
        btn.innerHTML = on ? BULB_ICON : MOON_ICON;
        btn.title = on ? '切换 PDF 亮色模式 (Ctrl/Cmd+L)' : '切换 PDF 暗色模式 (Ctrl/Cmd+L)';
        btn.setAttribute('aria-label', on ? '切换 PDF 亮色模式' : '切换 PDF 暗色模式');
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

  function setupCustomScaleSelect() {
    const container = document.getElementById('scaleSelectContainer');
    const select = document.getElementById('scaleSelect');
    const trigger = document.getElementById('scaleSelectTrigger');
    const label = document.getElementById('scaleSelectLabel');
    const menu = document.getElementById('scaleSelectMenu');
    if (!container || !select || !trigger || !label || !menu) {
      return;
    }

    let open = false;

    function getSelectedOption() {
      for (const option of select.options) {
        if (option.selected) {
          return option;
        }
      }
      return select.options[0] || null;
    }

    function isOptionVisible(option) {
      if (option.hidden && !option.selected) {
        return false;
      }
      if (option.id === 'customScaleOption' && option.disabled && !option.selected) {
        return false;
      }
      return true;
    }

    function syncLabel() {
      const option = getSelectedOption();
      label.textContent = option ? option.textContent.trim() : '';
    }

    function rebuildMenu() {
      while (menu.firstChild) {
        menu.removeChild(menu.firstChild);
      }
      for (const option of select.options) {
        if (!isOptionVisible(option)) {
          continue;
        }
        const item = document.createElement('li');
        item.className = 'office-scale-select-item';
        item.setAttribute('role', 'option');
        item.dataset.value = option.value;
        item.textContent = option.textContent.trim();
        if (option.selected) {
          item.classList.add('selected');
          item.setAttribute('aria-selected', 'true');
        } else {
          item.setAttribute('aria-selected', 'false');
        }
        item.addEventListener('click', (event) => {
          event.stopPropagation();
          if (option.value === 'custom') {
            return;
          }
          select.value = option.value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
          closeMenu();
        });
        menu.appendChild(item);
      }
      syncLabel();
    }

    function openMenu() {
      rebuildMenu();
      menu.classList.remove('hidden');
      trigger.setAttribute('aria-expanded', 'true');
      container.classList.add('open');
      open = true;
    }

    function closeMenu() {
      menu.classList.add('hidden');
      trigger.setAttribute('aria-expanded', 'false');
      container.classList.remove('open');
      open = false;
      syncLabel();
    }

    trigger.addEventListener('click', (event) => {
      event.stopPropagation();
      if (open) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    document.addEventListener('click', () => {
      if (open) {
        closeMenu();
      }
    });

    menu.addEventListener('click', (event) => {
      event.stopPropagation();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && open) {
        closeMenu();
        trigger.focus();
      }
    });

    const observer = new MutationObserver(() => {
      syncLabel();
      if (open) {
        rebuildMenu();
      }
    });
    observer.observe(select, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['selected', 'hidden', 'disabled'],
      characterData: true,
    });

    select.addEventListener('change', syncLabel);

    if (window.PDFViewerApplication?.eventBus) {
      PDFViewerApplication.eventBus.on('localized', () => {
        syncLabel();
        if (open) {
          rebuildMenu();
        }
      });
    }

    syncLabel();
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

  function toUint8Array(buffer) {
    if (!buffer) {
      return null;
    }
    if (buffer instanceof Uint8Array) {
      return buffer;
    }
    if (ArrayBuffer.isView(buffer)) {
      return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    }
    if (buffer instanceof ArrayBuffer) {
      return new Uint8Array(buffer);
    }
    if (Array.isArray(buffer) && buffer.length) {
      const data = new Uint8Array(buffer.length);
      for (let i = 0; i < buffer.length; i++) {
        data[i] = buffer[i];
      }
      return data;
    }
    return null;
  }

  function decodeBase64Pdf(base64) {
    const binary = atob(base64);
    const data = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      data[i] = binary.charCodeAt(i);
    }
    return data;
  }

  function openPdfDocument(payload) {
    if (!payload) {
      return;
    }
    if (payload.error) {
      console.error(payload.error);
      return;
    }
    const data = payload.bufferBase64
      ? decodeBase64Pdf(payload.bufferBase64)
      : toUint8Array(payload.buffer);
    if (data?.length) {
      PDFViewerApplication.open(data);
      return;
    }
    if (payload.path) {
      PDFViewerApplication.open(payload.path);
    }
  }

  window.addEventListener('load', function () {
    setupThemeAdapt();
    setupDarkMode();
    setupCustomScaleSelect();
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
    vscodeEvent.on("open", openPdfDocument)
    vscodeEvent.emit("init")
  }, { once: true });
}());
