const prettyMdPdf = require("pretty-markdown-pdf")
import { writeFileSync } from 'fs';
import * as vscode from 'vscode';

export class MarkdownService {

    private configPath;

    constructor(context: vscode.ExtensionContext) {
        this.configPath = context.globalStorageUri.fsPath+"/config.json"
    }

    public exportPdf(uri: vscode.Uri) {
        this.bulidConfig();
        prettyMdPdf.convertMdToPdf({ markdownFilePath: uri.fsPath, configFilePath: this.configPath })

    }

    public bulidConfig() {
        const config = {
            "type": [
                "pdf"
            ],
            "outputDirectory": "",
            "outputDirectoryRelativePathFile": false,
            "styles": [],
            "stylesRelativePathFile": false,
            "includeDefaultStyles": true,
            "highlight": true,
            "highlightStyle": "",
            "breaks": false,
            "emoji": true,
            "markdown-it-include": true,
            "executablePath": this.getChromiumPath(),
            "scale": 1,
            "displayHeaderFooter": true,
            "headerTemplate": "<div style=\"font-size: 9px; margin-left: 1cm;\"> <span class='title'></span></div> <div style=\"font-size: 9px; margin-left: auto; margin-right: 1cm; \"> <span class='date'></span></div>",
            "footerTemplate": "<div style=\"font-size: 9px; margin: 0 auto;\"> <span class='pageNumber'></span> / <span class='totalPages'></span></div>",
            "printBackground": true,
            "orientation": "portrait",
            "pageRanges": "",
            "format": "A4",
            "width": "",
            "height": "",
            "margin": "1cm",
            "quality": 100,
            "clip": {
                "height": null
            },
            "omitBackground": false
        };
        writeFileSync(this.configPath, config)
    }


    private getChromiumPath() {
        return "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
    }

}