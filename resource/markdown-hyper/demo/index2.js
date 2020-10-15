/* global editor, is_running_demo, HyperMD */

/// <reference path="./index.js" />

// the following code is just for test.
// useless for you.

function hmdModeLineInfo(lineNo) {
  if (lineNo === void 0) lineNo = cm.getCursor().line
  var tokens = cm.getLineTokens(lineNo)
  tokens = tokens.map(function (t) {
    return [t.string, t.type, t.state]
  })
  return tokens
}

function hmdReloadCSS() {
  var styleLinks = Array.prototype.slice.call(document.querySelectorAll("link"))
  styleLinks.forEach(function (link) { link.href += "?" + +new Date() })
}

function bind(id, func, event) {
  var btn = document.getElementById(id)
  btn.addEventListener(event || "click", func, false)
}

// Choose the first file to display
// Usually is README.md

!function () {
  /** global demo_filename */

  // playground have fun
  if ("replaceState" in history) history.replaceState({ text: "", title: document.title }, document.title, location.href)

  if (location.hash.substr(0, 3) === '#./') {
    demo_filename = location.hash.substr(1)
    return
  }

  for (var i = 0; i < navigator.languages.length; i++) {
    var lang = navigator.languages[i]

    if (lang === "zh-CN") demo_filename = "./docs/zh-CN/README.md"
    else continue

    break
  }
}()

// Use CDN to load CodeMirror and other stuff
// only works on https://*.github.io/ and https://*.laobubu.net/
// useless for you (maybe)

!function CDNPatch() {
  // inject requirejs to display progress
  var old_requirejs_load = requirejs.load
  requirejs.load = function (context, moduleId, url) {
    document.getElementById('loadingFileName').textContent = url
    return old_requirejs_load.call(this, context, moduleId, url)
  }

  if (is_running_demo) {
    // Reload CSS from CDN
    var node_modules_RE = /^.*node_modules\//ig
    var styleLinks = Array.prototype.slice.call(document.querySelectorAll("link"))
    styleLinks.forEach(function (link) {
      var href = link.href
      if (!node_modules_RE.test(href)) return
      href = href.replace(node_modules_RE, demo_page_lib_baseurl)

      link.href = href
    })
  }

}()

var current_baseuri = "./"
var current_url = ""
var history_op = "pushState"

window.onpopstate = function (ev) {
  var info = ev.state
  if (info && info.title) {
    document.title = info.title
    current_baseuri = info.current_baseuri

    editor_area.className = editor_area.className.replace(" loading-file", "")
    editor.setOption('hmdReadLink', { baseURI: current_baseuri }) // for images and links in Markdown
    editor.setValue(info.text)
  } else if (/^\#\.?\//.test(location.hash)) {
    // oops... bad status
    history_op = "replaceState"
    current_baseuri = "./" // hash path is always relative to index.html
    load_and_update_editor(location.hash.substr(1))
  }
}

function load_and_update_editor(url) {
  
  var editor_area = document.getElementById("editor_area")
  var clzName = editor_area.className
  editor_area.className = clzName + " loading_file"
  

  const vscodeEvent = getVscodeEvent();
  vscodeEvent.emit("init")
  vscodeEvent.on("open", value => {
    editor_area.className = clzName
    editor.setValue(value.content)
    editor.setOption('hmdReadLink', { baseURI: value.folderPath })
  })
  window.onkeypress = (e) => {
    if (e.ctrlKey && (e.key == 's' || e.key == "S")) {
      vscodeEvent.emit("save",editor.getValue())
      vscodeEvent.emit("doSave")
    }
  }
}

/**
 * Send AJAX request and update `current_baseuri`, `current_url`.
 * Note that url shall be resolved URL (aka. absolute path, or relative to current webpage URL)
 */
function ajax_load_file(url, callback) {
  current_baseuri = url.replace(/[^\/]*(?:\?.*)?$/, '')  // dirname
  current_url = url

  editor.setOption('hmdReadLink', { baseURI: current_baseuri }) // for images and links in Markdown

  var xmlhttp;
  if (window.XMLHttpRequest) { xmlhttp = new XMLHttpRequest() }
  else if (window.ActiveXObject) { xmlhttp = new ActiveXObject("Microsoft.XMLHTTP") }
  if (xmlhttp != null) {
    xmlhttp.onreadystatechange = function () {
      if (xmlhttp.readyState == 4) {
        // if (xmlhttp.status == 200)
        var text = xmlhttp.responseText
        var code = "" + xmlhttp.status
        if (/^[45]\d\d$/.test(code)) text = "## Fail: " + code + "\n\nCannot load " + url + "\n\n```\n" + text + "```\n"
        callback(text, url)
      }
    }
    xmlhttp.onerror = function () {
      callback("## Failed to Load\n\nCannot load " + url, url)
    }
    xmlhttp.open("GET", url, true)
    xmlhttp.send(null)
  }
}

/**
 * Handler for links like [Try out]
 */
function demo_tryout(info) {
  alert("Bazinga")
}
