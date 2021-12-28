import { openLink, hotKeys, imageParser, toolbar, windowHack } from "./util.js";

handler.on("open", (md) => {
  if (md.autoTheme) {
    window.addThemeCss()
  }
  const editor = new Vditor('vditor', {
    value: md.content,
    // _lutePath: md.rootPath+'/lute.min.js',
    _lutePath: 'https://cdn.jsdelivr.net/npm/vditor@3.8.10/dist/js/lute/lute.min.js',
    height: document.documentElement.clientHeight,
    outline: {
      enable: true,
      position: 'left',
    },
    mode: 'wysiwyg',
    tab: '\t',
    preview: {
      theme: {
        path: `https://cdn.jsdelivr.net/npm/vditor@3.8.10/dist/css/content-theme`
      },
      markdown: {
        toc: true
      },
      hljs: {
        style: 'github'
      },
      math: {
        engine: 'KaTeX',
        "inlineDigit": true
      }
    },
    toolbar,
    input(content) {
      handler.emit("save", content)
    },
    upload: {
      url: '/image',
      accept: 'image/*',
      handler(files) {
        let reader = new FileReader();
        reader.readAsBinaryString(files[0]);
        reader.onloadend = () => {
          handler.emit("img", reader.result)
        };
      }
    },
    hint: {
      emoji: {},
      extend: hotKeys
    }
  })

  openLink()
  windowHack(editor);
  if (md.viewAbsoluteLocal) {
    imageParser()
  }

  $('body').on('contextmenu', (e) => {
    e.stopPropagation();
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
    switch (id) {
      case "copy":
        document.execCommand("copy")
        break;
      case "paste":
        // document.execCommand("paste")
        vscodeEvent.emit('command', 'office.markdown.paste')
        break;
      case "exportPdf":
        vscodeEvent.emit("save", editor.getValue())
        vscodeEvent.emit('export')
        break;
      case "exportHtml":
        vscodeEvent.emit("save", editor.getValue())
        vscodeEvent.emit('exportPdfByHtml')
        break;
    }
  });

  $("#context-menu a").on("click", function () {
    $(this).parent().removeClass("show").hide();
  });
  handler.on("update", content => {
    editor.setValue(content);
  })
})

handler.emit("init")

