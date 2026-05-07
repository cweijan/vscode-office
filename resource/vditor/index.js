import { openLink, hotKeys, imageParser, getToolbar, autoSymbol, onToolbarClick, createContextMenu, scrollEditor } from "./util.js";

let state;
const TABLE_CODE_DOLLAR_PLACEHOLDER = "__VSCODE_OFFICE_VDITOR_TABLE_CODE_DOLLAR__"
const SEARCH_MATCH_CLASS = "vscode-office-search-match"
const SEARCH_ACTIVE_CLASS = "vscode-office-search-match--active"
const OUTLINE_ACTIVE_CLASS = "vscode-office-outline__item--active"

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
    value: prepareMarkdownForLute(md.content),
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
      patchLuteMarkdownTableCode(editor)
      restorePreparedMarkdownPlaceholders(editor)
      patchRenderedSetValue(editor)
      patchOutline(editor)
      bindOutlineTracking(editor)
      createSearch(editor)
      editor.vditor?.outline?.render?.(editor.vditor)
      handler.on("update", content => {
        editor.setValue(content);
        window.vscodeOfficeSearch?.refresh()
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

function createSearch(editor) {
  if (window.vscodeOfficeSearch) {
    return window.vscodeOfficeSearch
  }

  const panel = document.getElementById("vscode-office-search")
  const input = document.getElementById("vscode-office-search-input")
  const count = document.getElementById("vscode-office-search-count")
  const prevButton = document.getElementById("vscode-office-search-prev")
  const nextButton = document.getElementById("vscode-office-search-next")
  const closeButton = document.getElementById("vscode-office-search-close")

  const search = {
    activeIndex: -1,
    matches: [],
    markedRoot: null,
    query: "",
    visible: false,
  }

  const setCount = () => {
    if (search.matches.length === 0) {
      count.textContent = "0/0"
      return
    }
    count.textContent = `${search.activeIndex + 1}/${search.matches.length}`
  }

  const clearActive = () => {
    search.matches.forEach((match) => match.classList.remove(SEARCH_ACTIVE_CLASS))
  }

  const scrollMatchIntoView = (match) => {
    const container = match.closest(".vditor-reset") || match.closest(".vditor-preview")
    match.scrollIntoView({ block: "center", inline: "nearest" })
    if (container && container.scrollTop > 0) {
      container.dispatchEvent(new Event("scroll"))
    }
  }

  const setActiveMatch = (index) => {
    if (search.matches.length === 0) {
      search.activeIndex = -1
      setCount()
      return
    }
    clearActive()
    const nextIndex = (index + search.matches.length) % search.matches.length
    search.activeIndex = nextIndex
    const activeMatch = search.matches[nextIndex]
    activeMatch.classList.add(SEARCH_ACTIVE_CLASS)
    scrollMatchIntoView(activeMatch)
    setCount()
  }

  const getSearchRoot = () => {
    const vditor = editor?.vditor
    if (!vditor) {
      return null
    }
    if (vditor.preview?.element?.style?.display === "block") {
      return vditor.preview.element.lastElementChild || vditor.preview.element
    }
    return vditor[vditor.currentMode]?.element || null
  }

  const getViewportState = () => {
    const root = getSearchRoot()
    const scrollContainer =
      root?.closest?.(".vditor-reset") ||
      root?.parentElement ||
      document.scrollingElement ||
      document.documentElement

    return {
      scrollContainer,
      scrollLeft: scrollContainer?.scrollLeft ?? 0,
      scrollTop: scrollContainer?.scrollTop ?? 0,
      windowX: window.scrollX,
      windowY: window.scrollY,
    }
  }

  const restoreViewportState = (state) => {
    if (!state) {
      return
    }

    if (state.scrollContainer) {
      state.scrollContainer.scrollLeft = state.scrollLeft
      state.scrollContainer.scrollTop = state.scrollTop
    }

    if (window.scrollX !== state.windowX || window.scrollY !== state.windowY) {
      window.scrollTo(state.windowX, state.windowY)
    }
  }

  const clearHighlights = (done) => {
    const markedRoot = search.markedRoot
    if (!markedRoot || !window.Mark) {
      search.matches = []
      search.activeIndex = -1
      setCount()
      done?.()
      return
    }
    new window.Mark(markedRoot).unmark({
      className: SEARCH_MATCH_CLASS,
      done: () => {
        search.matches = []
        search.activeIndex = -1
        search.markedRoot = null
        setCount()
        done?.()
      }
    })
  }

  const highlightMatches = (query, { keepIndex = false } = {}) => {
    search.query = query
    clearHighlights(() => {
      if (!search.visible || !query) {
        return
      }
      const root = getSearchRoot()
      if (!root || !window.Mark) {
        return
      }
      search.markedRoot = root
      new window.Mark(root).mark(query, {
        acrossElements: true,
        separateWordSearch: false,
        className: SEARCH_MATCH_CLASS,
        exclude: ["mark", ".vscode-office-search", ".vscode-office-search *"],
        done: () => {
          search.matches = Array.from(root.querySelectorAll(`mark.${SEARCH_MATCH_CLASS}`))
          if (search.matches.length === 0) {
            search.activeIndex = -1
            setCount()
            return
          }
          const nextIndex = keepIndex && search.activeIndex >= 0 ?
            Math.min(search.activeIndex, search.matches.length - 1) : 0
          setActiveMatch(nextIndex)
        }
      })
    })
  }

  const open = () => {
    search.visible = true
    panel.style.display = "flex"
    input.focus()
    input.select()
    if (input.value.trim()) {
      highlightMatches(input.value.trim(), { keepIndex: true })
    } else {
      setCount()
    }
  }

  const close = ({ focusEditor = true } = {}) => {
    const viewportState = getViewportState()
    search.visible = false
    panel.style.display = "none"
    clearHighlights(() => {
      restoreViewportState(viewportState)
      if (focusEditor) {
        editor.focus()
        requestAnimationFrame(() => restoreViewportState(viewportState))
      }
    })
  }

  const refresh = () => {
    if (!search.visible || !input.value.trim()) {
      return
    }
    queueMicrotask(() => highlightMatches(input.value.trim(), { keepIndex: true }))
  }

  input.addEventListener("input", () => {
    highlightMatches(input.value.trim())
  })

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault()
      setActiveMatch(search.activeIndex + (event.shiftKey ? -1 : 1))
      return
    }
    if (event.key === "Escape") {
      event.preventDefault()
      close()
    }
  })

  prevButton.addEventListener("click", () => setActiveMatch(search.activeIndex - 1))
  nextButton.addEventListener("click", () => setActiveMatch(search.activeIndex + 1))
  closeButton.addEventListener("click", () => close())

  document.addEventListener("mousedown", (event) => {
    if (!search.visible || panel.contains(event.target)) {
      return
    }
    const editableRoot = editor?.vditor?.wysiwyg?.element
    if (editableRoot?.contains?.(event.target)) {
      close({ focusEditor: false })
    }
  })

  const editableRoot = editor?.vditor?.wysiwyg?.element
  editableRoot?.addEventListener("beforeinput", () => {
    if (search.visible) {
      close({ focusEditor: false })
    }
  })

  window.vscodeOfficeSearch = {
    close,
    open,
    refresh,
  }

  return window.vscodeOfficeSearch
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

function patchRenderedSetValue(editor) {
  if (editor.__renderedSetValuePatched) {
    return
  }

  const originalSetValue = editor.setValue.bind(editor)
  editor.setValue = (content, clearStack = false) => {
    const result = originalSetValue(content, clearStack)
    queueMicrotask(() => {
      restorePreparedMarkdownPlaceholders(editor)
      editor.vditor?.outline?.render?.(editor.vditor)
      window.vscodeOfficeSearch?.refresh()
    })
    return result
  }

  editor.__renderedSetValuePatched = true
}

function patchLuteMarkdownTableCode(editor) {
  const lute = editor?.vditor?.lute
  if (!lute || lute.__tableCodeDollarPatched) {
    return
  }

  wrapLuteMarkdownMethod(lute, "Md2VditorDOM")
  wrapLuteMarkdownMethod(lute, "Md2VditorIRDOM")
  wrapLuteMarkdownMethod(lute, "Md2HTML")
  wrapLuteHtmlMethod(lute, "SpinVditorDOM")
  wrapLuteHtmlMethod(lute, "HTML2VditorDOM")
  wrapLuteHtmlMethod(lute, "SpinVditorIRDOM")
  wrapLuteHtmlMethod(lute, "HTML2VditorIRDOM")
  lute.__tableCodeDollarPatched = true
}

function wrapLuteMarkdownMethod(lute, methodName) {
  const original = lute?.[methodName]
  if (typeof original !== "function") {
    return
  }

  lute[methodName] = (markdown, ...rest) => {
    const rendered = original(prepareMarkdownForLute(markdown), ...rest)
    return restorePreparedMarkdownString(rendered)
  }
}

function wrapLuteHtmlMethod(lute, methodName) {
  const original = lute?.[methodName]
  if (typeof original !== "function") {
    return
  }

  lute[methodName] = (html, ...rest) => {
    const rendered = original(protectTableCodeDollarInHtml(html), ...rest)
    return restorePreparedMarkdownString(rendered)
  }
}

function prepareMarkdownForLute(markdown) {
  if (!markdown || !markdown.includes('|') || !markdown.includes('`') || !markdown.includes('$')) {
    return markdown
  }

  const lines = markdown.split(/\r?\n/)
  const prepared = []

  for (let index = 0; index < lines.length; index++) {
    if (!isPotentialTableHeader(lines, index)) {
      prepared.push(lines[index])
      continue
    }

    const headerCells = splitMarkdownTableRow(lines[index])
    const separatorCells = splitMarkdownTableRow(lines[index + 1])
    const columnCount = Math.max(headerCells.length, separatorCells.length)

    prepared.push(joinMarkdownTableRow(headerCells, columnCount))
    prepared.push(joinMarkdownTableSeparator(separatorCells, columnCount))
    index += 1

    while (index + 1 < lines.length && isPotentialTableDataRow(lines[index + 1])) {
      index += 1
      prepared.push(joinMarkdownTableRow(splitMarkdownTableRow(lines[index]), columnCount, protectTableCodeCellForLute))
    }
  }

  return prepared.join('\n')
}

function isPotentialTableHeader(lines, index) {
  if (index + 1 >= lines.length) {
    return false
  }

  return isPotentialTableDataRow(lines[index]) && isMarkdownTableSeparator(lines[index + 1])
}

function isPotentialTableDataRow(line) {
  const trimmed = line.trim()
  return trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 1
}

function isMarkdownTableSeparator(line) {
  const cells = splitMarkdownTableRow(line)
  if (cells.length === 0) {
    return false
  }

  return cells.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s/g, '')))
}

function splitMarkdownTableRow(line) {
  const trimmed = line.trim()
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) {
    return []
  }

  const cells = []
  let current = ''
  let backtickCount = 0

  for (let index = 1; index < trimmed.length - 1; index++) {
    const char = trimmed[index]

    if (char === '`') {
      backtickCount += 1
      current += char
      continue
    }

    if (char === '|' && backtickCount % 2 === 0) {
      cells.push(current.trim())
      current = ''
      continue
    }

    current += char
  }

  cells.push(current.trim())
  return cells
}

function joinMarkdownTableRow(cells, columnCount, transformCell = (cell) => cell) {
  const normalizedCells = []
  for (let index = 0; index < columnCount; index++) {
    normalizedCells.push(transformCell(cells[index] ?? ''))
  }
  return `| ${normalizedCells.join(' | ')} |`
}

function joinMarkdownTableSeparator(cells, columnCount) {
  const normalizedCells = []
  for (let index = 0; index < columnCount; index++) {
    normalizedCells.push(normalizeMarkdownTableSeparatorCell(cells[index] ?? '---'))
  }
  return `| ${normalizedCells.join(' | ')} |`
}

function normalizeMarkdownTableSeparatorCell(cell) {
  const compact = cell.replace(/\s/g, '')
  const hasLeftColon = compact.startsWith(':')
  const hasRightColon = compact.endsWith(':')
  const dashCount = Math.max(3, compact.replace(/:/g, '').length || 3)
  return `${hasLeftColon ? ':' : ''}${'-'.repeat(dashCount)}${hasRightColon ? ':' : ''}`
}

function protectTableCodeCellForLute(cell) {
  if (!cell.includes('`') || !cell.includes('$')) {
    return cell
  }

  return replaceInlineCodeContent(cell, (content) => content.replace(/\$/g, TABLE_CODE_DOLLAR_PLACEHOLDER))
}

function replaceInlineCodeContent(text, replaceContent) {
  let result = ''

  for (let index = 0; index < text.length;) {
    if (text[index] !== '`') {
      result += text[index]
      index += 1
      continue
    }

    let markerLength = 1
    while (text[index + markerLength] === '`') {
      markerLength += 1
    }

    const marker = '`'.repeat(markerLength)
    const closeIndex = text.indexOf(marker, index + markerLength)
    if (closeIndex === -1) {
      result += text.slice(index)
      break
    }

    const contentStart = index + markerLength
    result += marker
    result += replaceContent(text.slice(contentStart, closeIndex))
    result += marker
    index = closeIndex + markerLength
  }

  return result
}

function protectTableCodeDollarInHtml(html) {
  if (typeof html !== 'string' || !html.includes('<table') || !html.includes('<code') || !html.includes('$')) {
    return html
  }

  return html.replace(/<table\b[\s\S]*?<\/table>/gi, (tableHtml) => {
    return tableHtml.replace(/<code\b[^>]*>[\s\S]*?<\/code>/gi, (codeHtml) => {
      return codeHtml.replace(/\$/g, TABLE_CODE_DOLLAR_PLACEHOLDER)
    })
  })
}

function restorePreparedMarkdownPlaceholders(editor) {
  const roots = [
    editor?.vditor?.wysiwyg?.element,
    editor?.vditor?.preview?.element,
    editor?.vditor?.ir?.element,
  ]

  roots.forEach((root) => {
    root?.querySelectorAll?.('table code').forEach((code) => {
      const text = code.textContent || ''
      if (text.includes(TABLE_CODE_DOLLAR_PLACEHOLDER)) {
        code.textContent = restorePreparedMarkdownString(text)
      }
    })
  })
}

function restorePreparedMarkdownString(value) {
  if (typeof value !== 'string' || !value.includes(TABLE_CODE_DOLLAR_PLACEHOLDER)) {
    return value
  }

  return value.replaceAll(TABLE_CODE_DOLLAR_PLACEHOLDER, '$')
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
    queueMicrotask(() => syncActiveOutlineHeading(currentVditor))
    return content.innerHTML
  }

  outline.__safeRenderPatched = true
}

function bindOutlineTracking(editor) {
  const vditor = editor?.vditor
  if (!vditor || vditor.__outlineTrackingBound) {
    return
  }

  const sync = () => syncActiveOutlineHeading(vditor)
  const syncSoon = () => queueMicrotask(sync)
  const previewContainer = vditor.preview?.element?.parentElement
  const wysiwygContainer = vditor.wysiwyg?.element

  previewContainer?.addEventListener("scroll", sync, { passive: true })
  wysiwygContainer?.addEventListener("scroll", sync, { passive: true })
  window.addEventListener("resize", sync, { passive: true })
  document.addEventListener("selectionchange", syncSoon)
  syncSoon()

  vditor.__outlineTrackingBound = true
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

function getOutlineViewportState(vditor, source) {
  if (!vditor || !source) {
    return null
  }

  if (vditor.preview?.element?.contains?.(source)) {
    const container = source.parentElement
    if (!container) {
      return null
    }
    const rect = container.getBoundingClientRect()
    return {
      topBoundary: rect.top + 16,
      container,
      mode: "preview",
    }
  }

  const rect = source.getBoundingClientRect()
  return {
    topBoundary: rect.top + 24,
    container: source,
    mode: "editor",
  }
}

function collectVisibleOutlineHeadings(source) {
  return Array.from(source?.querySelectorAll?.("h1, h2, h3, h4, h5, h6") || [])
    .filter((heading) => heading.id)
}

function findActiveHeading(headings, viewportState) {
  if (!headings.length || !viewportState) {
    return null
  }

  let active = headings[0]

  for (const heading of headings) {
    const rect = heading.getBoundingClientRect()
    if (rect.top <= viewportState.topBoundary) {
      active = heading
      continue
    }

    if (rect.top - viewportState.topBoundary < 32) {
      active = heading
    }
    break
  }

  return active
}

function syncActiveOutlineHeading(vditor) {
  const outlineContent = vditor?.outline?.element?.lastElementChild
  if (!outlineContent) {
    return
  }

  const source = getOutlineSourceElement(vditor)
  const viewportState = getOutlineViewportState(vditor, source)
  const headings = collectVisibleOutlineHeadings(source)
  const activeHeading = findActiveHeading(headings, viewportState)
  const activeId = activeHeading?.id

  const rows = outlineContent.querySelectorAll("[data-target-id]")
  let activeRow = null

  rows.forEach((row) => {
    const isActive = activeId && row.getAttribute("data-target-id") === activeId
    row.classList.toggle(OUTLINE_ACTIVE_CLASS, Boolean(isActive))
    if (isActive) {
      activeRow = row
    }
  })

  if (activeRow) {
    activeRow.scrollIntoView({ block: "nearest", inline: "nearest" })
  }
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
