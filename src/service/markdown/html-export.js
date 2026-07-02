const fs = require("fs")
const os = require("os")
const path = require("path")
const { pathToFileURL } = require("url")
const { createOutline } = require("./outline")
const isDev = process.argv.indexOf('--type=extensionHost') >= 0;

export async function exportHtml(exportFilePath, data) {
    console.log("[pretty-md-pdf] Exported to file: " + exportFilePath)
    fs.writeFileSync(exportFilePath, data, "utf-8")
}

export async function exportDocx(exportFilePath, data, config) {
    console.log("[pretty-md-pdf] Exported to file: " + exportFilePath)
    const html = await replaceDynamicContentWithImages(data, config, exportFilePath)
    const htmlToDocx = require("vscode-html-to-docx");
    const exportTask = await htmlToDocx(html, '', {}, '');
    const buffer = Buffer.from(await exportTask.arrayBuffer());
    fs.writeFileSync(exportFilePath, buffer)
}

/*
 * export a html to a pdf file
 */
export async function exportByType(filePath, data, type, config) {

    console.log("[pretty-md-pdf] Exporting (" + type + ") ...")
    const originPath = path.parse(filePath)
    let targetFilePath = originPath.dir + "/" + originPath.name + "." + type

    // export html
    if (type == "html") {
        exportHtml(targetFilePath, data)
        return
    } else if (type == "docx") {
        return exportDocx(targetFilePath, data, config)
    }

    // Linux: keep temp html beside the markdown file (snap/isolated browsers often cannot read /tmp)
    const tmpDir = process.platform === 'linux' ? originPath.dir : (isDev ? originPath.dir : os.tmpdir())
    let tmpfilename = path.resolve(tmpDir, originPath.name + "_tmp.html")
    exportHtml(tmpfilename, data)
    if (!isExistsPath(tmpfilename)) {
        throw new Error(`Temporary HTML file not found: ${tmpfilename}`)
    }

    const fileUrl = pathToFileURL(tmpfilename).href
    let launchOptions = {
        headless: true,
        executablePath: config["executablePath"] || undefined,
        args: ["--allow-file-access-from-files", ...(config["puppeteerArgs"] || [])]
    }

    const puppeteer = require("puppeteer-core")
    const browser = await puppeteer.launch(launchOptions).catch(error => {
        showErrorMessage("puppeteer.launch()", error)
        throw error
    })
    const page = await browser.newPage().catch(error => {
        showErrorMessage("browser.newPage()", error)
        throw error
    });
    await page.goto(fileUrl, { waitUntil: "load", timeout: 60000 }).catch(async error => {
        showErrorMessage("page.goto()", error)
        await page.setContent(data, { waitUntil: "load", timeout: 60000 })
    });

    // generate pdf
    if (type == "pdf") {
        // https://pptr.dev/api/puppeteer.pdfoptions
        const margin = config["margin"] || {};
        const pdfOptions = {
            format: config["format"] || "A4",
            printBackground: config["printBackground"] || true,
            margin: {
                top: margin.top != null ? `${margin.top}px` : undefined,
                right: margin.right != null ? `${margin.right}px` : undefined,
                bottom: margin.bottom != null ? `${margin.bottom}px` : undefined,
                left: margin.left != null ? `${margin.left}px` : undefined
            }
        }
        const pdf = await page.pdf(pdfOptions).catch(error => {
            showErrorMessage("page.pdf", error)
            throw error
        })

        let pdfBytes
        try {
            pdfBytes = await createOutline(pdf, data)
        } catch (error) {
            showErrorMessage("createOutline()", error)
            pdfBytes = Buffer.from(pdf)
        }
        fs.writeFileSync(targetFilePath, pdfBytes)

    }

    await browser.close()

    // delete temporary file
    let debug = config["debug"] || false
    if (!debug) {
        if (isExistsPath(tmpfilename)) {
            fs.unlink(tmpfilename, () => { })
        }
    }

    console.log("[pretty-md-pdf] Exported to file: " + targetFilePath)

}

async function replaceDynamicContentWithImages(data, config = {}, exportFilePath = "") {
    const containsKatex = data.indexOf('class="katex') >= 0 || data.indexOf("class='katex") >= 0
    const containsMermaid = data.indexOf('class="mermaid') >= 0 || data.indexOf("class='mermaid") >= 0
    if (!containsKatex && !containsMermaid) {
        return data
    }

    const puppeteer = require("puppeteer-core")
    let browser
    let tmpfilename = ""
    try {
        const tmpDir = exportFilePath ? path.dirname(exportFilePath) : os.tmpdir()
        const tmpBaseName = exportFilePath ? path.parse(exportFilePath).name : `markdown_${Date.now()}`
        tmpfilename = path.resolve(tmpDir, `${tmpBaseName}_math_tmp.html`)
        exportHtml(tmpfilename, data)

        browser = await puppeteer.launch({
            headless: true,
            executablePath: config["executablePath"] || undefined,
            args: ["--allow-file-access-from-files", ...(config["puppeteerArgs"] || [])]
        })
        const page = await browser.newPage()
        await page.setViewport({ width: 1200, height: 800, deviceScaleFactor: 2 })
        await page.goto(pathToFileURL(tmpfilename).href, { waitUntil: "load", timeout: 60000 })
        await page.evaluate(async () => {
            if (document.fonts && document.fonts.ready) {
                await document.fonts.ready
            }
        })

        await waitForMermaid(page)

        await page.addStyleTag({
            content: `
                body { background: transparent !important; }
                .vscode-office-docx-image-shot {
                    display: inline-block !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    text-align: left !important;
                    background: transparent !important;
                }
            `
        })

        await replaceMermaidWithImages(page)
        await replaceKatexWithImages(page)

        return await page.content()
    } catch (error) {
        showErrorMessage("replaceDynamicContentWithImages()", error)
        return data
    } finally {
        if (browser) {
            await browser.close()
        }
        if (!config["debug"] && tmpfilename && isExistsPath(tmpfilename)) {
            fs.unlink(tmpfilename, () => { })
        }
    }
}

async function waitForMermaid(page) {
    try {
        const hasMermaid = await page.evaluate(() => document.querySelectorAll('.mermaid').length > 0)
        if (!hasMermaid) {
            return
        }
        await page.waitForFunction(() => {
            const elements = Array.from(document.querySelectorAll('.mermaid'))
            return elements.length === 0 || elements.every(element => element.querySelector('svg') || element.getAttribute('data-processed') === 'true')
        }, { timeout: 10000 })
    } catch (error) {
        showErrorMessage("waitForMermaid()", error)
    }
}

async function replaceMermaidWithImages(page) {
    try {
        const handles = await page.evaluateHandle(() => {
            const diagrams = Array.from(document.querySelectorAll('.mermaid'))
                .filter(element => element.querySelector('svg'))
            diagrams.forEach((element, index) => {
                element.setAttribute('data-vscode-office-mermaid-id', String(index))
                element.classList.add('vscode-office-docx-image-shot')
            })
            return diagrams
        })
        const diagrams = await handles.getProperties()

        for (const handle of diagrams.values()) {
            await replaceElementWithImage(handle, {
                display: true,
                style: 'display:block;margin:1em auto',
                label: 'mermaid'
            })
        }
    } catch (error) {
        showErrorMessage("replaceMermaidWithImages()", error)
    }
}

async function replaceKatexWithImages(page) {
    try {
        const handles = await page.evaluateHandle(() => {
            const formulas = Array.from(document.querySelectorAll('.katex-display, .katex'))
                .filter(element => element.classList.contains('katex-display') || !element.closest('.katex-display'))
            formulas.forEach((element, index) => {
                element.setAttribute('data-vscode-office-math-id', String(index))
                element.setAttribute('data-vscode-office-math-display', String(element.classList.contains('katex-display')))
                element.classList.add('vscode-office-docx-image-shot')
            })
            return formulas
        })
        const formulas = await handles.getProperties()

        for (const handle of formulas.values()) {
            await replaceKatexFormulaWithImage(handle)
        }
    } catch (error) {
        showErrorMessage("replaceKatexWithImages()", error)
    }
}

async function replaceKatexFormulaWithImage(handle) {
    try {
        const formula = handle.asElement()
        if (!formula) {
            return
        }
        const box = await formula.boundingBox()
        if (!box || box.width <= 0 || box.height <= 0) {
            return
        }
        const image = await formula.screenshot({ type: 'png', omitBackground: true })
        const imageBuffer = Buffer.from(image)
        const src = `data:image/png;base64,${imageBuffer.toString('base64')}`
        await formula.evaluate((element, imageSrc, width, height) => {
            const isDisplay = element.getAttribute('data-vscode-office-math-display') === 'true'
            const imageElement = document.createElement('img')
            imageElement.setAttribute('src', imageSrc)
            imageElement.setAttribute('width', String(Math.ceil(width)))
            imageElement.setAttribute('height', String(Math.ceil(height)))
            imageElement.setAttribute('style', [
                `width:${Math.ceil(width)}px`,
                `height:${Math.ceil(height)}px`,
                isDisplay ? 'display:block' : 'display:inline-block',
                isDisplay ? 'margin:1em auto' : 'vertical-align:middle'
            ].join(';'))
            imageElement.setAttribute('alt', element.textContent || 'math')
            element.replaceWith(imageElement)
        }, src, box.width, box.height)
    } catch (error) {
        showErrorMessage("replaceKatexFormulaWithImage()", error)
    }
}

async function replaceElementWithImage(handle, options = {}) {
    try {
        const element = handle.asElement()
        if (!element) {
            return
        }
        const box = await element.boundingBox()
        if (!box || box.width <= 0 || box.height <= 0) {
            return
        }
        const image = await element.screenshot({ type: 'png', omitBackground: true })
        const imageBuffer = Buffer.from(image)
        const src = `data:image/png;base64,${imageBuffer.toString('base64')}`
        await element.evaluate((target, imageSrc, width, height, imageOptions) => {
            const imageElement = document.createElement('img')
            imageElement.setAttribute('src', imageSrc)
            imageElement.setAttribute('width', String(Math.ceil(width)))
            imageElement.setAttribute('height', String(Math.ceil(height)))
            imageElement.setAttribute('style', [
                `width:${Math.ceil(width)}px`,
                `height:${Math.ceil(height)}px`,
                imageOptions.style || (imageOptions.display ? 'display:block;margin:1em auto' : 'display:inline-block;vertical-align:middle')
            ].join(';'))
            imageElement.setAttribute('alt', imageOptions.label || target.textContent || 'image')
            target.replaceWith(imageElement)
        }, src, box.width, box.height, options)
    } catch (error) {
        showErrorMessage("replaceElementWithImage()", error)
    }
}

function showErrorMessage(msg, error) {
    if (!error) return;
    console.error("ERROR: " + msg)
    console.log("ERROR: " + msg)
    if (error) {
        console.error(error.toString())
        console.log(error)
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
