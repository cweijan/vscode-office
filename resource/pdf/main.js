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
  window.addEventListener('load', function () {
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
