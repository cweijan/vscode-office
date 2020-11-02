const fs = require("fs")
const os = require("os")
const path = require("path")
const url = require("url")
const URI = require("vscode").Uri
const { createOutline } = require("./outline")

const exportTypes = require("./export-types.json")

let INSTALL_CHECK = false

async function convertMarkdown(inputMarkdownFile, outputFilePath, outputFileType, chromiumArgs, config) {
  try {
    // check active window
    let ext = path.extname(inputMarkdownFile)
    if (!isExistsPath(inputMarkdownFile)) {
      console.error("File name does not exist!")
      return
    }

    let uri = URI.file(inputMarkdownFile)

    let types_format = exportTypes
    let filename = ""
    let types = []
    if (types_format.indexOf(outputFileType) >= 0) {
      types[0] = outputFileType
    } else if (outputFileType === "settings") {
      let types_tmp = config["type"] || "pdf"
      if (types_tmp && !Array.isArray(types_tmp)) {
        types[0] = types_tmp
      } else {
        types = config["type"] || "pdf"
      }
    } else if (outputFileType === "all") {
      types = types_format
    } else {
      showErrorMessage(`Supported formats: ${exportTypes.join(", ")}.`)
      return
    }

    // convert and export markdown to `exportTypes`
    if (types && Array.isArray(types) && types.length > 0) {
      for (let i = 0; i < types.length; i++) {
        let type = types[i]
        if (types_format.indexOf(type) >= 0) {
          filename = inputMarkdownFile.replace(ext, "." + type)
          let text = fs.readFileSync(inputMarkdownFile).toString()
          let content = convertMarkdownToHtml(inputMarkdownFile, type, text, config)
          let html = makeHtml(content, uri, config)
          await exportPdf(html, filename, outputFilePath, type, uri, chromiumArgs, config)
        } else {
          showErrorMessage(`Supported formats: ${exportTypes.join(", ")}.`)
          return
        }
      }
    } else {
      showErrorMessage(`Supported formats: ${exportTypes.join(", ")}.`)
      return
    }
  } catch (error) {
    showErrorMessage("convertMarkdown()", error)
  }
}

/*
 * convert markdown to html (markdown-it)
 */
function convertMarkdownToHtml(filename, type, text, config) {
  let md = {}

  try {
    try {
      console.log("[pretty-md-pdf] Converting (convertMarkdownToHtml) ...")
      let hljs = require("highlight.js")
      let breaks = config["breaks"]
      md = require("markdown-it")({
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
    let cheerio = require("cheerio")
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

    md.use(require("markdown-it-checkbox"))
      .use(require("markdown-it-katex"))
      .use(require("markdown-it-plantuml"))
      .use(require("markdown-it-named-headers"))
      .use(require("markdown-it-toc-done-right").default)
      .use(require("markdown-it-anchor").default)

    // emoji
    let f = config["emoji"]
    if (f) {
      // let emojies_defs = require(path.join(__dirname, "data", "emoji.json"))
      let options = {}

      try {
        options = {
          // defs: emojies_defs
        }
      } catch (error) {
        showErrorMessage("markdown-it-emoji:options", error)
      }
      md.use(require("markdown-it-emoji"), options)
      md.renderer.rules.emoji = function (token, idx) {
        let emoji = token[idx].markup
        let emojipath = path.join(__dirname, "node_modules", "emoji-images", "pngs", emoji + ".png")
        let emojidata = readFile(emojipath, null).toString("base64")
        if (emojidata) {
          return "<img class='emoji' alt='" + emoji + "' src='data:image/png;base64," + emojidata + "' />"
        } else {
          return ":" + emoji + ":"
        }
      }
    }

    // markdown-it-container
    // https://github.com/markdown-it/markdown-it-container
    md.use(require("markdown-it-container"), "", {
      validate: function (name) {
        return name.trim().length
      },
      render: function (tokens, idx) {
        if (tokens[idx].info.trim() !== "") {
          return `<div class="${tokens[idx].info.trim()}">\n`
        } else {
          return `</div>\n`
        }
      }
    })

    // markdown-it-include
    // https://github.com/camelaissani/markdown-it-include
    // the syntax is :[alt-text](relative-path-to-file.md)
    // https://talk.commonmark.org/t/transclusion-or-including-sub-documents-for-reuse/270/13
    if (config['markdown-it-include']) {
      md.use(require("markdown-it-include"), {
        root: path.dirname(filename),
        includeRe: /\:(?:\[[^\]]*\])?\(([^)]+\.*)\)/i
      });
    }

    return md.render(text)

  } catch (error) {
    showErrorMessage("convertMarkdownToHtml()", error)
  }
}

function slug(string) {
  try {
    let stg = encodeURI(string.trim()
      .toLowerCase()
      .replace(/[\]\[\!\"\#\$\%\&\"\(\)\*\+\,\.\/\:\;\<\=\>\?\@\\\^\_\{\|\}\~\`]/g, "")
      .replace(/\s+/g, "-")
      .replace(/^\-+/, "")
      .replace(/\-+$/, ""))
    return stg
  } catch (error) {
    showErrorMessage("slug()", error)
  }
}

/*
 * make html
 */
function makeHtml(data, uri, config) {
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
    let mustache = require("mustache")

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

/*
 * export a html to a html file
 */
function exportHtml(data, filename) {
  fs.writeFile(filename, data, "utf-8", function (error) {
    if (error) {
      showErrorMessage("exportHtml()", error)
      return
    }
  })
}

/*
 * export a html to a pdf file (html-pdf)
 */
async function exportPdf(data, filename, outputFilePath, type, uri, chromiumArgs, config) {

  if (!INSTALL_CHECK) {
    return
  }
  if (!checkPuppeteerBinary(config)) {
    showErrorMessage("Chromium or Chrome does not exist! \
      ")
    return
  }

  let exportFilename = outputFilePath || getOutputDir(filename, uri, config)

  console.log("[pretty-md-pdf] Exporting (" + type + ") ...")

  try {
    // export html
    if (type == "html") {
      exportHtml(data, exportFilename)
      console.log("[pretty-md-pdf] Exported to file: " + exportFilename)
      return
    }

    const puppeteer = require("puppeteer")
    // create temporary file
    let f = path.parse(filename)
    let tmpfilename = path.join(f.dir, f.name + "_tmp.html")
    exportHtml(data, tmpfilename)
    let options = {
      executablePath: config["executablePath"] || undefined,
      args: chromiumArgs || undefined
    }

    let browser = await puppeteer.launch(options).catch(error => {
      showErrorMessage("puppeteer.launch()", error)
    })
    let page = await browser.newPage().catch(error => {
      showErrorMessage("browser.newPage()", error)
    });
    await page.goto(URI.file(tmpfilename).toString(), { waitUntil: "networkidle0" }).catch(error => {
      showErrorMessage("page.goto()", error)
    });

    // generate pdf
    // https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pagepdfoptions
    if (type == "pdf") {
      // If width or height option is set, it overrides the format option.
      // In order to set the default value of page size to A4, we changed it from the specification of puppeteer.
      let width_option = config["width"] || ""
      let height_option = config["height"] || ""
      let format_option = ""
      if (!width_option && !height_option) {
        format_option = config["format"] || "A4"
      }
      let landscape_option
      if (config["orientation"] == "landscape") {
        landscape_option = true
      } else {
        landscape_option = false
      }
      let options = {
        scale: config["scale"],
        displayHeaderFooter: config["displayHeaderFooter"],
        headerTemplate: config["headerTemplate"] || "",
        footerTemplate: config["footerTemplate"] || "",
        printBackground: config["printBackground"],
        landscape: landscape_option,
        pageRanges: config["pageRanges"] || "",
        format: format_option,
        width: config["width"] || "",
        height: config["height"] || "",
        margin: {
          top: config["margin"]["top"] || "",
          right: config["margin"]["right"] || "",
          bottom: config["margin"]["bottom"] || "",
          left: config["margin"]["left"] || ""
        }
      }
      const pdf = await page.pdf(options).catch(error => {
        showErrorMessage("page.pdf", error)
      })

      const pdfBytes = await createOutline(pdf,data)
      fs.writeFileSync(exportFilename, pdfBytes)

    }

    // generate png and jpeg
    // https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pagescreenshotoptions
    if (type == "png" || type == "jpeg") {
      // Quality options do not apply to PNG images.
      let quality_option
      if (type == "png") {
        quality_option = undefined
      }
      if (type == "jpeg") {
        quality_option = config["quality"] || 100
      }

      // screenshot size
      let clip_x_option = config["clip"]["x"]
      let clip_y_option = config["clip"]["y"]
      let clip_width_option = config["clip"]["width"]
      let clip_height_option = config["clip"]["height"]
      let options
      if (clip_x_option !== null && clip_y_option !== null && clip_width_option !== null && clip_height_option !== null) {
        options = {
          path: exportFilename,
          quality: quality_option,
          fullPage: false,
          clip: {
            x: clip_x_option,
            y: clip_y_option,
            width: clip_width_option,
            height: clip_height_option,
          },
          omitBackground: config["omitBackground"],
        }
      } else {
        options = {
          path: exportFilename,
          quality: quality_option,
          fullPage: true,
          omitBackground: config["omitBackground"],
        }
      }
      await page.screenshot(options).catch(error => {
        showErrorMessage("page.screenshot()", error)
      })
    }

    await browser.close()

    // delete temporary file
    let debug = config["debug"] || false
    if (!debug) {
      if (isExistsPath(tmpfilename)) {
        fs.unlink(tmpfilename, () => { })
      }
    }

    console.log("[pretty-md-pdf] Exported to file: " + exportFilename)
  } catch (error) {
    showErrorMessage("exportPdf()", error)
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

function getOutputDir(filename, resource, config) {
  try {
    let outputDir
    if (resource === undefined) {
      return filename
    }
    let outputDirectory = config["outputDirectory"] || ""
    if (outputDirectory.length === 0) {
      return filename
    }

    // Use a home directory relative path If it starts with ~.
    if (outputDirectory.indexOf("~") === 0) {
      outputDir = outputDirectory.replace(/^~/, os.homedir())
      mkdir(outputDir)
      return path.join(outputDir, path.basename(filename))
    }

    // Use path if it is absolute
    if (path.isAbsolute(outputDirectory)) {
      if (!isExistsDir(outputDirectory)) {
        showErrorMessage(`The output directory specified by the markdown-pdf.outputDirectory option does not exist.\
          Check the markdown-pdf.outputDirectory option. ` + outputDirectory)
        return
      }
      return path.join(outputDirectory, path.basename(filename))
    }

    // Use a workspace relative path if there is a workspace and markdown-pdf.outputDirectoryRootPath = workspace
    let outputDirectoryRelativePathFile = config["outputDirectoryRelativePathFile"]
    let root = getFolder(resource)

    if (outputDirectoryRelativePathFile === false && root) {
      outputDir = path.join(root.uri.fsPath, outputDirectory)
      mkdir(outputDir)
      return path.join(outputDir, path.basename(filename))
    }

    // Otherwise look relative to the markdown file
    outputDir = path.join(path.dirname(resource.fsPath), outputDirectory)
    mkdir(outputDir)
    return path.join(outputDir, path.basename(filename))
  } catch (error) {
    showErrorMessage("getOutputDir()", error)
  }
}

function getFolder(resource) {
  return {
    index: 0,
    name: path.basename(resource.path),
    uri: URI.file(path.dirname(resource.path))
  }
}

function mkdir(path) {
  if (isExistsDir(path)) {
    return
  }
  fs.mkdirSync(path, { recursive: true })
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
      INSTALL_CHECK = true
      return true
    }

    // bundled Chromium
    const puppeteer = require("puppeteer")
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

    const puppeteer = require("puppeteer")
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
      showErrorMessage("Failed to download Chromium! \
        If you are behind a proxy, set the proxy option in config.json", ex)
    }

    console.log("Chromium downloaded to " + revisionInfo.folderPath)

    let localRevisions = await browserFetcher.localRevisions()
    localRevisions = localRevisions.filter(revision => revision !== revisionInfo.revision)
    // Remove previous chromium revisions.
    let cleanupOldVersions = localRevisions.map(revision => browserFetcher.remove(revision))

    if (checkPuppeteerBinary(config)) {
      INSTALL_CHECK = true

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
      INSTALL_CHECK = true
    } else {
      await installChromium(config)
    }
  } catch (error) {
    showErrorMessage("init()", error)
  }
}

module.exports = {
  convertMarkdown,
  init
}
