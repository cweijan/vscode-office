function init_math_preview(cm) {
  var mathRenderer = null
  var win = new FloatWin("math-preview")
  var supressed = false

  win.closeBtn.addEventListener("click", function(){
    supressed = true // for current TeX block
  }, false)

  function updatePreview(expr) {
    if (supressed) return
    if (!demoPageConfig.mathPreview) return

    if (!mathRenderer) { // initialize renderer and preview window
      mathRenderer = cm.hmd.FoldMath.createRenderer(
        document.getElementById("math-preview-content"),
        "display"
      )
      mathRenderer.onChanged = function () {
        // finished rendering. show the window
        if (!win.visible) {
          var cursorPos = cm.charCoords(cm.getCursor(), "window")
          win.moveTo(cursorPos.left, cursorPos.bottom)
        }
        win.show()
      }
    }

    console.log("[MathPreview] " + expr)

    if (!mathRenderer.isReady()) return
    mathRenderer.startRender(expr)
  }

  function hidePreview() {
    console.log("[MathPreview] (exit)")

    win.hide()
    supressed = false
  }

  cm.setOption("hmdFoldMath", {
    onPreview: updatePreview,
    onPreviewEnd: hidePreview,
  })
}
