function init_lab(cm) {
  var winLab = window['winLab'] = new FloatWin("winLab")

  var $items = winLab.el.querySelectorAll('[lab-bind]')
  var bindRule = {}
  for (var i = 0; i < $items.length; i++) {
    var $item = $items[i]
    var attr = $item.getAttribute('lab-bind')
    var attrFF = $item.getAttribute('lab-bind-ff')
    var attrFold = $item.getAttribute('lab-bind-fold')
    var attrDemo = $item.getAttribute('lab-bind-demo')

    if (attrFF) { // HyperMD.FlipFlop
      bind(cm.hmd, attrFF + ".state", $item, {
        updateObj: updateFlipFlop
      })
    } else if (attrFold) { // HyperMD.Fold
      var foldOpts = cm.hmd.Fold._enabled
      if (!(attrFold in foldOpts)) {
        foldOpts[attrFold] = false
      }
      bind(foldOpts, attrFold, $item, {
        updateObj: updateFoldState
      })
    } else if (attrDemo) { // Demo page features (see index.js  demoPageConfig )
      bind(demoPageConfig, attrDemo, $item)
    } else {
      bind(cm.hmd, attr, $item)
    }
  }

  //----------------------------

  function updateFoldState(_, type, enabled) {
    cm.hmd.Fold.setStatus(type, enabled)
  }

  //----------------------------

  function updateFlipFlop(ff, _unused, value) { ff.set(value) }

  //----------------------------

  function bind(obj, expr, dom, opts) {
    if (!opts) opts = {
      updateObj: null,
      updateDom: null,
      readDom: null,
    }

    if (/^label$/i.test(dom.tagName)) {
      dom = dom.querySelector('input') || dom.nextElementSibling
    }
    var btype = (dom.matches('input[type=checkbox]')) ? 1 : 0

    var expr_parts = expr.split('.')
    expr = expr_parts.pop()
    for (var i = 0; i < expr_parts.length; i++) {
      obj = obj[expr_parts[i]]
      if (!obj) return
    }

    function toObj() {
      var v
      if (opts.readDom) {
        v = readDom(dom)
      } else {
        switch (btype) {
          case 1: v = dom.checked; break
          default: v = dom.value;
        }
      }

      if (opts.updateObj) opts.updateObj(obj, expr, v)
      else obj[expr] = v
    }

    function toDom(v) {
      if (opts.updateDom) {
        opts.updateDom(dom, v)
        return
      }

      switch (btype) {
        case 1: dom.checked = !!v; break
        default: dom.value = v;
      }
    }

    dom.addEventListener("change", toObj, false)

    var pd = Object.getOwnPropertyDescriptor(obj, expr)
    if (pd.get || pd.set) {
      var old_setter = pd.set
      pd.set = function (v) {
        toDom(v)
        old_setter && old_setter(v)
      }
    } else {
      var _val = obj[expr]
      pd = {
        get: function () { return _val },
        set: function (v) { toDom(_val = v) },
        configurable: true,
        enumerable: true,
      }
    }
    Object.defineProperty(obj, expr, pd)

    toDom(obj[expr])
  }
}
