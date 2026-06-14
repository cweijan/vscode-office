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

export async function exportDocx(exportFilePath, data) {
    console.log("[pretty-md-pdf] Exported to file: " + exportFilePath)
    const exportTask = await require("vscode-html-to-docx")(data, '', {}, '');
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
        return exportDocx(targetFilePath, data)
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
