const fs = require("fs")
const os = require("os")
const puppeteer = require("puppeteer-core")
const path = require("path")
const cheerio = require("cheerio")
const url = require("url")
const URI = require("vscode").Uri
const hljs = require("highlight.js")
const markdownIt = require("markdown-it")
const mustache = require("mustache")
const markdownItCheckbox = require("markdown-it-checkbox")
const markdownItKatex = require("markdown-it-katex")
const markdownItPlantuml = require("markdown-it-plantuml")
const markdownItHeaders = require("markdown-it-named-headers")
const markdownItToc = require("markdown-it-toc-done-right")
const markdownItAnchor = require("markdown-it-anchor")
const { exportByType } = require('./html-export')

async function convertMarkdown(inputMarkdownFile, config) {

  const type = config.type
  const uri = URI.file(inputMarkdownFile)
  const text = fs.readFileSync(inputMarkdownFile).toString()
  const content = convertMarkdownToHtml(inputMarkdownFile, type, text, config)
  const html = mergeHtml(content, uri, config)
  await exportByType(inputMarkdownFile, html, type, config)

}


/**
 * create toc if not exists.
 */
function addTocToContent(text) {
  return text.match(/\[toc\]/i) ? text : '[toc]\n' + text;
}

/*
 * convert markdown to html (markdown-it)
 */
function convertMarkdownToHtml(filename, type, text, config) {
  text = addTocToContent(text)
  let md = {}

  try {
    try {
      console.log("[pretty-md-pdf] Converting (convertMarkdownToHtml) ...")
      let breaks = config["breaks"]
      md = markdownIt({
        html: true,
        breaks: breaks,
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
        let $ = cheerio.load(html)
        $("img").each(function () {
          let src = $(this).attr("src")
          let href = convertImgPath(src, filename)
          $(this).attr("src", href)
        })
        return $.html()
      }
    }

    md.use(markdownItCheckbox)
      .use(markdownItKatex)
      .use(markdownItPlantuml)
      .use(markdownItHeaders)
      .use(markdownItToc)
      .use(markdownItAnchor)

    return md.render(text)

  } catch (error) {
    showErrorMessage("convertMarkdownToHtml()", error)
  }
}


/*
 * make html
 */
function mergeHtml(data, uri, config) {
  try {
    // read styles
    let style = ""
    style += readStyles(uri, config)

    // get title
    let title = path.basename(uri.fsPath)

    // read template
    let filename = path.join(__dirname, "template", "template.html")
    let template = readFile(filename)

    // compile template


    let view = {
      title: title,
      style: style,
      content: data
    }
    return mustache.render(template, view)
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

function isExistsDir(dirname) {
  if (dirname.length === 0) {
    return false
  }
  try {
    if (fs.statSync(dirname).isDirectory()) {
      return true
    } else {
      console.warn("Directory does not exist!")
      return false
    }
  } catch (error) {
    console.warn(error.message)
    return false
  }
}

function getFolder(resource) {
  return {
    index: 0,
    name: path.basename(resource.path),
    uri: URI.file(path.dirname(resource.path))
  }
}



function readFile(filename, encode) {
  if (filename.length === 0) {
    return ""
  }
  if (!encode && encode !== null) {
    encode = "utf-8"
  }
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

function makeCss(filename) {
  try {
    let css = readFile(filename)
    if (css) {
      return "\n<style>\n" + css + "\n</style>\n"
    } else {
      return ""
    }
  } catch (error) {
    showErrorMessage("makeCss()", error)
  }
}

function readStyles(uri, config) {
  try {
    let includeDefaultStyles
    let style = makeCss(path.join(__dirname, "styles", "katex.min.css"))
    let styles = ""
    let filename = ""
    let i;

    includeDefaultStyles = config["includeDefaultStyles"]

    // 1. read the default styles
    if (includeDefaultStyles) {
      filename = path.join(__dirname, "styles", "markdown.css")
      style += makeCss(filename)
    }

    // 2. read the style of the markdown.styles setting.
    if (includeDefaultStyles) {
      styles = config["styles"]
      if (styles && Array.isArray(styles) && styles.length > 0) {
        for (i = 0; i < styles.length; i++) {
          let href = fixHref(uri, styles[i])
          style += "<link rel=\"stylesheet\" href=\"" + href + "\" type=\"text/css\">"
        }
      }
    }

    // 3. read the style of the highlight.js.
    let highlightStyle = config["highlightStyle"] || ""
    if (config["highlight"]) {
      filename = path.join(__dirname, "styles", highlightStyle || "arduino-light.css")
      style += makeCss(filename)
    }

    // 4. read the style of the markdown-pdf.
    if (includeDefaultStyles) {
      filename = path.join(__dirname, "styles", "markdown-pdf.css")
      style += makeCss(filename)
    }

    // 5. read the style of the markdown-pdf.styles settings.
    styles = config["styles"] || ""
    if (styles && Array.isArray(styles) && styles.length > 0) {
      for (i = 0; i < styles.length; i++) {
        let href = fixHref(uri, styles[i])
        style += "<link rel=\"stylesheet\" href=\"" + href + "\" type=\"text/css\">"
      }
    }

    return style
  } catch (error) {
    showErrorMessage("readStyles()", error)
  }
}

function fixHref(resource, href, config) {
  try {
    if (!href) {
      return href
    }

    // Use href if it is already an URL
    let hrefUri = URI.parse(href)
    if (["http", "https"].indexOf(hrefUri.scheme) >= 0) {
      return hrefUri.toString()
    }

    // Use a home directory relative path If it starts with ^.
    if (href.indexOf("~") === 0) {
      return URI.file(href.replace(/^~/, os.homedir())).toString()
    }

    // Use href as file URI if it is absolute
    if (path.isAbsolute(href) || hrefUri.scheme === "file") {
      return URI.file(href).toString()
    }

    // Use a workspace relative path if there is a workspace and markdown-pdf.stylesRelativePathFile is false
    let stylesRelativePathFile = config["stylesRelativePathFile"]
    let root = getFolder(resource)
    if (stylesRelativePathFile === false && root) {
      return URI.file(path.join(root.uri.fsPath, href)).toString()
    }

    // Otherwise look relative to the markdown file
    return URI.file(path.join(path.dirname(resource.fsPath), href)).toString()
  } catch (error) {
    showErrorMessage("fixHref()", error)
  }
}

function checkPuppeteerBinary(config) {
  try {
    // settings.json
    let executablePath = config["executablePath"] || ""
    if (isExistsPath(executablePath)) {
      return true
    }

    // bundled Chromium
    executablePath = puppeteer.executablePath()
    if (isExistsPath(executablePath)) {
      return true
    } else {
      return false
    }
  } catch (error) {
    showErrorMessage("checkPuppeteerBinary()", error)
  }
}

/*
 * puppeteer install.js
 * https://github.com/GoogleChrome/puppeteer/blob/master/install.js
 */
async function installChromium(config) {
  try {
    console.log("[pretty-md-pdf] Installing Chromium ...")

    // proxy setting
    setProxy(config)

    const puppeteerMetadata = require(path.join(__dirname, "node_modules", "puppeteer", "package.json"))

    let revision = puppeteerMetadata.puppeteer.chromium_revision
    let browserFetcher = puppeteer.createBrowserFetcher()
    let revisionInfo = browserFetcher.revisionInfo(revision)

    // download Chromium
    try {
      await browserFetcher.download(revisionInfo.revision, (downloadedBytes, totalBytes) => {
        let progress = parseInt(downloadedBytes / totalBytes * 100)
        console.log("[pretty-md-pdf] Installing Chromium " + progress + "%")
      })
    } catch (ex) {
      console.log("[pretty-md-pdf] ERROR: Failed to download Chromium!")
    }

    console.log("Chromium downloaded to " + revisionInfo.folderPath)

    let localRevisions = await browserFetcher.localRevisions()
    localRevisions = localRevisions.filter(revision => revision !== revisionInfo.revision)
    // Remove previous chromium revisions.
    let cleanupOldVersions = localRevisions.map(revision => browserFetcher.remove(revision))

    if (checkPuppeteerBinary(config)) {

      console.log("[pretty-md-pdf] Chromium installation succeeded!")
      console.log("[pretty-md-pdf] Chromium installation succeeded.")

      await Promise.all(cleanupOldVersions)
    }
  } catch (error) {
    showErrorMessage("installChromium()", error)
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

function setProxy(config) {
  let https_proxy = config["proxy"] || ""
  if (https_proxy) {
    process.env.HTTPS_PROXY = https_proxy
    process.env.HTTP_PROXY = https_proxy
  }
}

async function init(config) {
  try {
    if (checkPuppeteerBinary(config)) {
    } else {
      await installChromium(config)
    }
  } catch (error) {
    showErrorMessage("init()", error)
  }
}

export const convertMd = async (options) => {
  const config = options.config
  options.outputFileType = config.type[0]
  console.log(`[pretty-md-pdf] Converting markdown file: ${options.markdownFilePath}`)
  await init(config)
  await convertMarkdown(
    path.resolve(options.markdownFilePath),
    config
  )
}
