const fs = require("fs")
const path = require("path")
const url = require("url")
const URI = require("vscode").Uri
const markdownIt = require("markdown-it")
const markdownItCheckbox = require("markdown-it-checkbox")
const markdownItKatex = require("./ext/markdown-it-katex")
const markdownItMermaid = require("./ext/markdown-it-mermaid").default;
const markdownItPlantuml = require("markdown-it-plantuml")
const markdownItToc = require("markdown-it-toc-done-right")
const markdownItAnchor = require("markdown-it-anchor")
const markdownItObsidian = require("./ext/markdown-it-obsidian")
const markdownItObsidianCallouts = require("markdown-it-obsidian-callouts")
const markdownItMark = require("markdown-it-mark")
const markdownItFrontMatterExport = require("./ext/markdown-it-front-matter")
const { exportByType } = require('./html-export')
const { buildExportThemeCss } = require('./exportThemeCss')
const { buildHljsThemeCss } = require('./exportCodeTheme')
const { buildMermaidExportConfig } = require('./exportMermaidTheme')

async function convertMarkdown(inputMarkdownFile, config) {

  const type = config.type
  const uri = URI.file(inputMarkdownFile)
  const text = fs.readFileSync(inputMarkdownFile).toString()
  const content = convertMarkdownToHtml(inputMarkdownFile, type, text, config)
  const html = mergeHtml(content, uri, type, config)

  // insert mermaid script
  const $ = require("cheerio").load(html);
  const containsMermaid = $('.mermaid').length > 0;
  if (containsMermaid) {
    const mermaidScript = isProExport(config)
      ? `
    <script src="${getMermaidScriptSrc(type)}"></script>
    <script>mermaid.initialize(${JSON.stringify(buildMermaidExportConfig(config.exportTheme))});</script>
    `
      : `
    <script src="${getMermaidScriptSrc(type)}"></script>
    <script>mermaid.initialize({startOnLoad:true});</script>
    `;

    $('body').append(mermaidScript);
  }

  await exportByType(inputMarkdownFile, $.html(), type, config)
}

function getMermaidScriptSrc(type) {
  if (type === "html") {
    return `https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js`;
  }
  return url.pathToFileURL(path.resolve(__dirname, '..', "resource", 'markdown', 'dist', 'js', 'mermaid', 'mermaid.min.js')).href;
}


/**
 * create toc if not exists.
 */
function addTocToContent(text, config) {
  const needOutline = !text.match(/\[toc\]/i) && !config.withoutOutline;
  if (!needOutline) {
    return text;
  }
  const toc = '[toc]\n';
  const frontMatterMatch = text.match(/^---[\s\S]*?\n---\s*\n?/);
  if (frontMatterMatch) {
    const frontMatter = frontMatterMatch[0];
    return frontMatter + toc + text.slice(frontMatter.length);
  }
  return toc + text;
}

/*
 * convert markdown to html (markdown-it)
 */
function convertMarkdownToHtml(filename, type, text, config) {
  if (type == 'pdf') text = addTocToContent(text, config)
  let md = {}

  try {
    try {
      const hljs = require("highlight.js");
      console.log("[pretty-md-pdf] Converting (convertMarkdownToHtml) ...")
      const breaks = config["breaks"]
      md = markdownIt({
        html: true,
        breaks,
        highlight: function (str, lang) {
          if (lang && hljs.getLanguage(lang)) {
            try {
              str = hljs.highlight(lang, str, true).value
            } catch (error) {
              str = md.utils.escapeHtml(str)

              showErrorMessage("markdown-it:highlight", error)
            }
          } else {
            str = md.utils.escapeHtml(str)
          }
          return "<pre class='hljs'><code><div>" + str + "</div></code></pre>"
        }
      })
    } catch (error) {
      showErrorMessage("require(\"markdown-it\")", error)
    }

    // convert the img src of the markdown
    let defaultRender = md.renderer.rules.image
    md.renderer.rules.image = function (tokens, idx, options, env, self) {
      let token = tokens[idx]
      let href = token.attrs[token.attrIndex("src")][1]
      // console.log("original href: " + href)
      if (type === "html") {
        href = decodeURIComponent(href).replace(/("|")/g, "")
      } else {
        href = convertImgPath(href, filename)
      }
      // console.log("converted href: " + href)
      token.attrs[token.attrIndex("src")][1] = href
      // // pass token to default renderer.
      return defaultRender(tokens, idx, options, env, self)
    }

    if (type !== "html") {
      // convert the img src of the html
      md.renderer.rules.html_block = function (tokens, idx) {
        let html = tokens[idx].content
        let $ = require("cheerio").load(html)
        $("img").each(function () {
          let src = $(this).attr("src")
          let href = convertImgPath(src, filename)
          $(this).attr("src", href)
        })
        return $.html()
      }
    }

    md.use(markdownItFrontMatterExport)
      .use(markdownItObsidian)
      .use(markdownItObsidianCallouts)
      .use(markdownItMark)
      .use(markdownItCheckbox)
      .use(markdownItAnchor)
      .use(markdownItToc)
      .use(markdownItKatex)
      .use(markdownItPlantuml)
      .use(markdownItMermaid)

    return md.render(text)

  } catch (error) {
    showErrorMessage("convertMarkdownToHtml()", error)
  }
}


/*
 * make html
 */
function mergeHtml(content, uri, type, config = {}) {
  try {
    const mustache = require("mustache")
    const title = path.basename(uri.fsPath)
    const style = readStyles(type, config)
    const templatePath = path.join(__dirname, "template", "template.html")
    const bodyClass = isProExport(config)
        ? ` class="vditor-export${config.exportTheme.isDark ? ' vditor-export--dark' : ''}"`
        : ''
    return mustache.render(readFile(templatePath), { title, style, content, bodyClass })
  } catch (error) {
    showErrorMessage("makeHtml()", error)
  }
}

function isExistsPath(path) {
  if (path.length === 0) {
    return false
  }
  try {
    fs.accessSync(path)
    return true
  } catch (error) {
    console.warn(error.message)
    return false
  }
}

function readFile(filename, encode = "utf-8") {
  if (filename.indexOf("file://") === 0) {
    if (process.platform === "win32") {
      filename = filename.replace(/^file:\/\/\//, "")
        .replace(/^file:\/\//, "")
    } else {
      filename = filename.replace(/^file:\/\//, "")
    }
  }
  if (isExistsPath(filename)) {
    return fs.readFileSync(filename, encode)
  } else {
    return ""
  }
}

function convertImgPath(src, filename) {
  try {
    let href = decodeURIComponent(src)
    href = href.replace(/("|")/g, "")
      .replace(/\\/g, "/")
      .replace(/#/g, "%23")
    let protocol = url.parse(href).protocol
    if (protocol === "file:" && href.indexOf("file:///") !== 0) {
      return href.replace(/^file:\/\//, "file:///")
    } else if (protocol === "file:") {
      return href
    } else if (!protocol || path.isAbsolute(href)) {
      href = path.resolve(path.dirname(filename), href).replace(/\\/g, "/")
        .replace(/#/g, "%23")
      if (href.indexOf("//") === 0) {
        return "file:" + href
      } else if (href.indexOf("/") === 0) {
        return "file://" + href
      } else {
        return "file:///" + href
      }
    } else {
      return src
    }
  } catch (error) {
    showErrorMessage("convertImgPath()", error)
  }
}

function makeCss(filename, resolveRelativeUrls = false, type) {
  try {
    let css = readFile(filename)
    if (css) {
      if (resolveRelativeUrls) {
        css = resolveCssUrls(css, path.dirname(filename), type)
      }
      return "\n<style>\n" + css + "\n</style>\n"
    } else {
      return ""
    }
  } catch (error) {
    showErrorMessage("makeCss()", error)
  }
}

function resolveCssUrls(css, basePath, type) {
  return css.replace(/url\((['"]?)([^'")]+)\1\)/g, (match, quote, assetPath) => {
    const href = assetPath.trim()
    if (/^(data:|https?:|file:|about:|#)/i.test(href)) {
      return match
    }
    if (type === "html" && basePath.includes("katex")) {
      return `url("https://cdn.jsdelivr.net/npm/katex@0.16.2/dist/${href.replace(/^\.\//, "")}")`
    }
    return `url("${url.pathToFileURL(path.resolve(basePath, href)).href}")`
  })
}

function isProExport(config = {}) {
  return config.useProExport === true && !!config.exportTheme
}

function resolveStylesBasePath() {
  const candidates = [
    path.join(__dirname, "styles"),
    path.join(__dirname, "..", "styles"),
  ]
  for (const candidate of candidates) {
    if (isExistsPath(path.join(candidate, "arduino-light.css"))) {
      return candidate
    }
  }
  return path.join(__dirname, "styles")
}

function readLegacyStyles(type) {
  const basePath = resolveStylesBasePath()
  const katexPath = path.resolve(__dirname, '..', "resource", 'markdown', 'dist', 'js', 'katex', 'katex.min.css');
  const files = [
    'arduino-light.css',
    'markdown-export-legacy.css',
    'markdown-obsidian-export-legacy.css',
    'markdown-pdf-export-legacy.css',
  ]
  return files.map(file => makeCss(path.join(basePath, file))).join("")
    + makeCss(katexPath, true, type)
}

function readStyles(type, config = {}) {
  try {
    if (!isProExport(config)) {
      return readLegacyStyles(type)
    }
    const basePath = resolveStylesBasePath()
    const katexPath = path.resolve(__dirname, '..', "resource", 'markdown', 'dist', 'js', 'katex', 'katex.min.css');
    const files = ['markdown.css', 'markdown-pdf.css']
    const hljsThemeCss = buildHljsThemeCss(config.exportTheme)
    const exportThemeCss = buildExportThemeCss(config.exportTheme)
    return files.map(file => makeCss(path.join(basePath, file))).join("")
      + hljsThemeCss
      + makeCss(katexPath, true, type)
      + exportThemeCss
  } catch (error) {
    showErrorMessage("readStyles()", error)
  }
}

function showErrorMessage(msg, error) {
  console.error("ERROR: " + msg)
  console.log("ERROR: " + msg)
  if (error) {
    console.error(error.toString())
    console.log(error)
  }
}

export const convertMd = async (options) => {
  const config = options.config
  options.outputFileType = config.type[0]
  console.log(`[pretty-md-pdf] Converting markdown file: ${options.markdownFilePath}`)
  await convertMarkdown(
    path.resolve(options.markdownFilePath),
    config
  )
}
