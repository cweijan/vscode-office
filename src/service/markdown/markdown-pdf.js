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
const markdownItObsidianCallouts = require("markdown-it-obsidian-callouts")
const markdownItMark = require("markdown-it-mark")
const markdownItObsidian = require("./ext/markdown-it-obsidian")
const markdownItFrontMatterExport = require("./ext/markdown-it-front-matter")
const { parse } = require("node-html-parser")
const { exportByType } = require('./html-export')

async function convertMarkdown(inputMarkdownFile, config) {

  const type = config.type
  const uri = URI.file(inputMarkdownFile)
  const text = fs.readFileSync(inputMarkdownFile).toString()
  const content = convertMarkdownToHtml(inputMarkdownFile, type, text, config)
  const html = mergeHtml(content, uri, type)

  // insert mermaid script
  let outputHtml = html
  const root = parse(html)
  const containsMermaid = root.querySelector('.mermaid') != null;
  if (containsMermaid) {
    const mermaidScript = `
    <script src="${getMermaidScriptSrc(type)}"></script>
    <script>mermaid.initialize({startOnLoad:true});</script>
    `;
    outputHtml = appendHtmlToBody(outputHtml, mermaidScript);
  }

  await exportByType(inputMarkdownFile, outputHtml, type, config)
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
    return text
  }
  const frontMatterMatch = text.match(/^---[\s\S]*?\n---\s*\n?/)
  if (frontMatterMatch) {
    return frontMatterMatch[0] + '[toc]\n' + text.slice(frontMatterMatch[0].length)
  }
  return `[toc]\n${text}`;
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
        const root = parse(html)
        root.querySelectorAll("img").forEach((img) => {
          let src = img.getAttribute("src")
          let href = convertImgPath(src, filename)
          img.setAttribute("src", href)
        })
        return root.toString()
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
function mergeHtml(content, uri, type) {
  try {
    const mustache = require("mustache")
    const title = path.basename(uri.fsPath)
    const style = readStyles(type)
    const templatePath = path.join(__dirname, "template", "template.html")
    return mustache.render(readFile(templatePath), { title, style, content })
  } catch (error) {
    showErrorMessage("makeHtml()", error)
  }
}

function appendHtmlToBody(html, fragment) {
  if (html.includes("</body>")) {
    return html.replace("</body>", `${fragment}</body>`)
  }
  return `${html}${fragment}`
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

function readStyles(type) {
  try {
    const basePath = path.join(__dirname, "styles");
    const katexPath = path.resolve(__dirname, '..', "resource", 'markdown', 'dist', 'js', 'katex', 'katex.min.css');
    const files = ['arduino-light.css', 'markdown.css', 'markdown-pdf.css']
    return files.map(file => makeCss(path.join(basePath, file))).join("")
      + makeCss(katexPath, true, type)
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
