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

export async function exportDocx(exportFilePath, data) {
    console.log("[pretty-md-pdf] Exported to file: " + exportFilePath)
    const exportTask = require("vscode-html-to-docx")(data, '', {}, '');
    fs.writeFileSync(exportFilePath, await exportTask)
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

    let tmpfilename = path.join(isDev ? originPath.dir : os.tmpdir(), originPath.name + "_tmp.html")
    exportHtml(tmpfilename, data)
    let options = {
        executablePath: config["executablePath"] || undefined
    }

    const puppeteer = require("puppeteer-core")
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
    if (type == "pdf") {
        // https://pptr.dev/api/puppeteer.pdfoptions
        const options = {
            format: config["format"] || "A4",
            printBackground: config["printBackground"] || true,
            margin: {
                top: config["margin"]["top"],
                right: config["margin"]["right"],
                bottom: config["margin"]["bottom"],
                left: config["margin"]["left"]
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