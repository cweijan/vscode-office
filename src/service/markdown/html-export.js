const puppeteer = require("puppeteer-core")
const fs = require("fs")
const os = require("os")
const path = require("path")
const URI = require("vscode").Uri
const { createOutline } = require("./outline")
const isDev = process.argv.indexOf('--type=extensionHost') >= 0;

export async function exportHtml(exportFilePath, data) {
    console.log("[pretty-md-pdf] Exported to file: " + exportFilePath)
    fs.writeFileSync(exportFilePath, data, "utf-8")
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
    }

    if (!checkPuppeteerBinary(config)) {
        showErrorMessage("Chromium or Chrome does not exist! \n")
        return
    }


    let tmpfilename = path.join(isDev ? originPath.dir : os.tmpdir(), originPath.name + "_tmp.html")
    exportHtml(tmpfilename, data)
    let options = {
        executablePath: config["executablePath"] || undefined
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

        const pdfBytes = await createOutline(pdf, data)
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