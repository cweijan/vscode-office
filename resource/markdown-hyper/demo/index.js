var is_running_demo = /\.github\.|laobubu\.net/.test(location.hostname)

var demo_page_baseurl = window.location.href.replace(/[\?\#].*$/, '').replace(/\/[^\/]+$/, '/')
var demo_page_lib_baseurl = is_running_demo ? "https://cdn.jsdelivr.net/npm/" : (demo_page_baseurl + "node_modules/")
var demo_filename = "README.md"


if (requirejs) requirejs.config({
  baseUrl: `${document.getElementById('rootPath').value}`,
  paths: {
    "hypermd": `${document.getElementById('rootPath').value}/`,
  },
  packages: requirejs_packages, // see: requirejs_packages.js
  waitSeconds: 15
})

require([
  ///////////////////////////////////////
  /// Core! Load them first!          ///
  ///////////////////////////////////////

  'codemirror/lib/codemirror',
  'hypermd/core',

  ///////////////////////////////////////
  /// CodeMirror                      ///
  ///////////////////////////////////////

  // Code Highlighting
  "codemirror/mode/htmlmixed/htmlmixed", // for embedded HTML
  "codemirror/mode/stex/stex", // for Math TeX Formular
  "codemirror/mode/yaml/yaml", // for Front Matters

  // NOTE: For code blocks,
  //       addon "mode-loader" can load modes automatically if configured properly
  'codemirror/mode/javascript/javascript',  // eg. javascript

  ///////////////////////////////////////
  /// HyperMD modules                 ///
  ///////////////////////////////////////

  'hypermd/mode/hypermd', // ESSENTIAL

  'hypermd/addon/hide-token',
  'hypermd/addon/cursor-debounce',
  'hypermd/addon/fold',
  'hypermd/addon/fold-link',
  'hypermd/addon/fold-image',
  'hypermd/addon/fold-math',
  'hypermd/addon/fold-html',
  'hypermd/addon/fold-emoji',
  'hypermd/addon/read-link',
  'hypermd/addon/click',
  'hypermd/addon/hover',
  'hypermd/addon/paste',
  'hypermd/addon/insert-file',
  'hypermd/addon/mode-loader',
  'hypermd/addon/table-align',

  'hypermd/keymap/hypermd',

  /////////////////////////////////////////////
  /// PowerPack with third-party libraries  ///
  /////////////////////////////////////////////

  'hypermd/powerpack/fold-emoji-with-emojione',
  // 'hypermd/powerpack/fold-emoji-with-twemoji',

  // 'hypermd/powerpack/insert-file-with-smms',

  'hypermd/powerpack/hover-with-marked',

  'hypermd/powerpack/fold-math-with-katex',
  // 'hypermd/powerpack/fold-math-with-mathjax',

  'hypermd/powerpack/paste-with-turndown',
  'turndown-plugin-gfm',

], function (CodeMirror, HyperMD) {
  'use strict';
  var myTextarea = document.getElementById('demo')
  // HyperMD magic. See https://laobubu.net/HyperMD/docs/
  var editor = HyperMD.fromTextArea(myTextarea, {
    mode: {
      name: "hypermd",
      hashtag: true,  // this syntax is not actived by default
    },
    hmdClick: clickHandler,
    hmdFold: {
      image: true,
      link: true,
      math: true,
      html: true, // maybe dangerous
      emoji: true,
    }
  })
  $('body').on('contextmenu', (e) => {
    var top = e.pageY - 10;
    var left = e.pageX - 90;
    $("#context-menu").css({
      display: "block",
      top: top,
      left: left
    }).addClass("show");
  }).on("click", (e) => {
    $("#context-menu").removeClass("show").hide();
    let id = e.target.id;
    if (!e.target.id) {
      return;
    }
    id = id.replace("Menu", "")
    switch (id) {
      case "copy":
        document.execCommand("copy")
        break;
      case "paste":
        document.execCommand("paste")
        break;
    }
  });

  $("#context-menu a").on("click", function () {
    $(this).parent().removeClass("show").hide();
  });

  const vscodeEvent = getVscodeEvent();
  editor.on("change", (_instance, changeObj) => {
    if (changeObj.origin == "setValue") {
      return;
    }
    vscodeEvent.emit("codemirrorEdit", changeObj)
  })
  editor.setSize(null, "100%") // set height

  // for debugging
  window.CodeMirror = CodeMirror
  window.HyperMD = HyperMD
  window.editor = editor
  window.cm = editor

  // for demo page only:
  document.body.className += " loaded"
  document.getElementById('loadSplash').setAttribute('style', 'display:none')

  load_and_update_editor(demo_filename)

  // Preview Tex Math formula
  // @see demo/math-preview.js
  init_math_preview(editor)

  // Watch editor and generate TOC
  // @see demo/toc.js
  init_toc(editor)

  // @see demo/lab.js
  init_lab(editor)
}, function (err) {
  var div = document.getElementById('loadErrorSplash')
  var ul = document.getElementById('loadErrorList')

  div.style.display = ''
  var mods = err.requireModules
  for (var i = 0; i < mods.length; i++) {
    var li = document.createElement("li")
    li.textContent = mods[i]
    ul.appendChild(li)
  }
})

var demoPageConfig = {
  directOpen: /directOpen/.test(window.location.search),
  mathPreview: true,
}

function clickHandler(info, cm) {
  if (info.type === "link" || info.type === "url") {
    var url = info.url
    if ((demoPageConfig.directOpen || info.ctrlKey || info.altKey) && !/^http/i.test(url) && /\.(?:md|markdown)$/.test(url.replace(/[?#].*$/, ''))) {
      // open a link whose URL is *.md with ajax_load_file
      // and supress HyperMD default behavoir
      load_and_update_editor(url) // see index2.js
      return false
    } else if (demoPageConfig.directOpen && url) {
      window.open(url)
      return false
    } else if (/^\[(?:Try out|试试看)\]$/i.test(info.text)) {
      demo_tryout(info) // see index2.js
      return false
    }
  }
  if (info.type === "hashtag") {
    var msg = "You clicked a hashtag"
    if (info.ctrlKey) msg += " (with Ctrl)"
    if (info.altKey) msg += " (with Alt)"
    console.log(msg, info.text, info.pos)
  }
}
