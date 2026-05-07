import { openLink, hotKeys, imageParser, getToolbar, autoSymbol, onToolbarClick, createContextMenu, scrollEditor } from "./util.js";

let state;
function loadConfigs() {
  const elem = document.getElementById('configs')
  try {
    state = JSON.parse(elem.getAttribute('data-config'));
    const { platform } = state;
    document.getElementById('vditor').classList.add(platform)
  } catch (error) {
    console.log('loadConfigFail')
  }
  return state;
}
loadConfigs()

handler.on("open", async (md) => {
  const { config, language } = md;
  addAutoTheme(md.rootPath, config.editorTheme)
  handler.on('theme', theme => {
    loadTheme(md.rootPath, theme)
  })
  const editor = new Vditor('vditor', {
    value: md.content,
    _lutePath: md.rootPath + '/lute.min.js',
    cdn: 'https://unpkg.com/vscode-vditor@3.8.19',
    height: document.documentElement.clientHeight,
    outline: {
      enable: config.openOutline,
      position: 'left',
    },
    toolbarConfig: {
      hide: config.hideToolbar
    },
    cache: {
      enable: false,
    },
    mode: 'wysiwyg',
    lang: language == 'zh-cn' ? 'zh_CN' : config.editorLanguage,
    icon: "material",
    tab: '\t',
    preview: {
      theme: {
        path: `${md.rootPath}/css/content-theme`
      },
      markdown: {
        toc: true,
        codeBlockPreview: config.previewCode,
      },
      hljs: {
        style: config.previewCodeHighlight.style,
        lineNumber: config.previewCodeHighlight.showLineNumber
      },
      extPath: md.rootPath,
      math: {
        engine: 'KaTeX',
        "inlineDigit": true
      }
    },
    toolbar: await getToolbar(md.rootPath),
    extPath: md.rootPath,
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
    }, after() {
      patchOutline(editor)
      editor.vditor?.outline?.render?.(editor.vditor)
      handler.on("update", content => {
        editor.setValue(content);
      })
      openLink()
      onToolbarClick(editor)
    }
  })
  autoSymbol(handler, editor, config);
  createContextMenu(editor)
  imageParser(config.viewAbsoluteLocal)
  scrollEditor(md.scrollTop)
  zoomElement('.vditor-content')
}).emit("init")


function addAutoTheme(rootPath, theme) {
  loadCSS(rootPath, 'base.css')
  loadTheme(rootPath, theme)
}

function loadTheme(rootPath, theme) {
  loadCSS(rootPath, `theme/${theme}.css`)
  document.getElementById('vditor').setAttribute('data-editor-theme', theme)
}

function loadCSS(rootPath, path) {
  const style = document.createElement('link');
  style.rel = "stylesheet";
  style.type = "text/css";
  style.href = `${rootPath}/css/${path}`;
  document.documentElement.appendChild(style)
}

function patchOutline(editor) {
  const vditor = editor?.vditor
  const outline = vditor?.outline
  if (!outline || outline.__safeRenderPatched) {
    return
  }

  outline.render = function renderSafeOutline(currentVditor) {
    const content = this.element?.lastElementChild
    if (!content) {
      return ""
    }

    const source = getOutlineSourceElement(currentVditor)
    if (!source) {
      content.innerHTML = ""
      return ""
    }

    const headings = collectOutlineHeadings(source)
    if (headings.length === 0) {
      content.innerHTML = ""
      return ""
    }

    content.innerHTML = ""
    content.appendChild(buildOutlineTree(headings))
    content.onclick = (event) => handleOutlineClick(event, currentVditor)
    return content.innerHTML
  }

  outline.__safeRenderPatched = true
}

function getOutlineSourceElement(vditor) {
  if (!vditor) {
    return null
  }

  if (vditor.preview?.element?.style?.display === "block") {
    return vditor.preview.element.lastElementChild
  }

  return vditor[vditor.currentMode]?.element || null
}

function collectOutlineHeadings(root) {
  const headings = []
  const directChildren = Array.from(root.children || [])

  directChildren.forEach((element, index) => {
    const level = getHeadingLevel(element)
    if (!level) {
      return
    }

    const id = ensureHeadingId(element, index)

    headings.push({
      id,
      level,
      text: (element.textContent || "").replace(/\u200b/g, "").trim() || id,
      content: createOutlineLabelContent(element)
    })
  })

  return headings
}

function getHeadingLevel(element) {
  if (!element?.tagName) {
    return 0
  }

  const match = element.tagName.match(/^H([1-6])$/i)
  if (!match) {
    return 0
  }

  return Number(match[1])
}

function ensureHeadingId(element, index) {
  if (element.id) {
    return element.id
  }

  const id = `vditor-outline-heading-${index}`
  element.id = id
  return id
}

function buildOutlineTree(headings) {
  const root = { level: 0, children: [] }
  const stack = [root]

  headings.forEach((heading) => {
    const node = { ...heading, children: [] }
    while (stack.length > 1 && stack[stack.length - 1].level >= node.level) {
      stack.pop()
    }
    stack[stack.length - 1].children.push(node)
    stack.push(node)
  })

  return buildOutlineList(root.children)
}

function buildOutlineList(nodes) {
  const list = document.createElement("ul")

  nodes.forEach((node) => {
    const item = document.createElement("li")
    const row = document.createElement("span")
    row.setAttribute("data-target-id", node.id)

    const action = createOutlineAction(node.children.length > 0)
    const label = document.createElement("span")
    if (node.content) {
      label.appendChild(node.content)
    } else {
      label.textContent = node.text
    }

    row.appendChild(action)
    row.appendChild(label)
    item.appendChild(row)

    if (node.children.length > 0) {
      item.appendChild(buildOutlineList(node.children))
    }

    list.appendChild(item)
  })

  return list
}

function createOutlineAction(expandable) {
  const wrapper = document.createElement("span")
  wrapper.innerHTML = expandable ? getOutlineActionSvg() : "<svg></svg>"
  return wrapper.firstElementChild
}

function createOutlineLabelContent(element) {
  const fragment = document.createDocumentFragment()
  const nodes = Array.from(element.childNodes || [])

  if (nodes.length === 0) {
    fragment.appendChild(document.createTextNode((element.textContent || "").replace(/\u200b/g, "").trim()))
    return fragment
  }

  nodes.forEach((node) => {
    const cloned = node.cloneNode(true)
    if (cloned.nodeType === Node.TEXT_NODE) {
      cloned.textContent = (cloned.textContent || "").replace(/\u200b/g, "")
    }
    fragment.appendChild(cloned)
  })

  return fragment
}

function getOutlineActionSvg() {
  if (document.getElementById("vditorIconScript")) {
    return "<svg class='vditor-outline__action'><use xlink:href='#vditor-icon-down'></use></svg>"
  }

  return "<svg class=\"vditor-outline__action\" viewBox=\"0 0 32 32\"><path d=\"M3.76 6.12l12.24 12.213 12.24-12.213 3.76 3.76-16 16-16-16 3.76-3.76z\"></path></svg>"
}

function handleOutlineClick(event, vditor) {
  const action = event.target.closest(".vditor-outline__action")
  if (action) {
    const childList = action.parentElement?.nextElementSibling
    if (childList) {
      const isClosed = action.classList.toggle("vditor-outline__action--close")
      childList.style.display = isClosed ? "none" : "block"
    }
    event.preventDefault()
    event.stopPropagation()
    return
  }

  const targetRow = event.target.closest("[data-target-id]")
  if (!targetRow) {
    return
  }

  const source = getOutlineSourceElement(vditor)
  const target = source?.querySelector?.(`#${CSS.escape(targetRow.getAttribute("data-target-id"))}`) ||
    document.getElementById(targetRow.getAttribute("data-target-id"))

  if (!target) {
    return
  }

  event.preventDefault()
  event.stopPropagation()
  scrollOutlineTarget(target, source, vditor)
}

function scrollOutlineTarget(target, source, vditor) {
  if (!vditor) {
    target.scrollIntoView({ block: "start" })
    return
  }

  if (vditor.options.height === "auto") {
    let offset = target.offsetTop + vditor.element.offsetTop
    if (!vditor.options.toolbarConfig.pin) {
      offset += vditor.toolbar.element.offsetHeight
    }
    window.scrollTo(window.scrollX, offset)
    return
  }

  if (vditor.element.offsetTop < window.scrollY) {
    window.scrollTo(window.scrollX, vditor.element.offsetTop)
  }

  if (vditor.preview.element.contains(source)) {
    source.parentElement.scrollTop = target.offsetTop
  } else {
    source.scrollTop = target.offsetTop
  }
}
