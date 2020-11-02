const fs = require("fs")
const path = require("path")

const markdownPdf = require("./markdown-pdf")

module.exports = {
    convertMd: async (options) => {
        options = options || {}

        options.outputFileType = options.outputFileType || "pdf"

        if (!options.markdownFilePath || !options.markdownFilePath.toLowerCase().endsWith(".md") || !fs.existsSync(options.markdownFilePath)) {
            throw new Error(`[pretty-md-pdf] ERROR: Markdown file '${options.markdownFilePath}' does not exist or is not an '.md' file`)
        }

        let configPath = path.join(__dirname, "config.json")

        if (options.configFilePath && options.configFilePath.trim() !== "") {
            configPath = options.configFilePath
        }

        if (!configPath || !fs.existsSync(configPath)) {
            throw new Error(`[pretty-md-pdf] ERROR: Config file '${configPath}' does not exist`)
        }

        let config = JSON.parse(
            fs.readFileSync(configPath).toString()
        )

        if (config.outputDirectory && config.outputDirectory.trim() !== "") {
            config.outputDirectory = path.resolve(config.outputDirectory)
        }

        if (options.outputFilePath && options.outputFilePath.trim() !== "") {
            options.outputFilePath = path.resolve(options.outputFilePath)
        }

        console.log(`[pretty-md-pdf] Converting markdown file: ${options.markdownFilePath}`)

        await markdownPdf.init(config)
        await markdownPdf.convertMarkdown(
            path.resolve(options.markdownFilePath),
            options.outputFilePath,
            options.outputFileType,
            options.chromiumArgs,
            config
        )
    }
}
