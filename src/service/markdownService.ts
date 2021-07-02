import { existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import * as vscode from 'vscode';
import { convertMd } from "./markdown/markdown-pdf";

export class MarkdownService {

    constructor() {
    }

    public async exportPdfByHtml(uri: vscode.Uri) {
        await convertMd({ markdownFilePath: uri.fsPath, config: this.getConfig('html') })
        vscode.window.showInformationMessage("Export markdown to html success!")
    }

    public async exportPdf(uri: vscode.Uri) {
        vscode.window.showInformationMessage("Starting export markdown to pdf.")
        await convertMd({ markdownFilePath: uri.fsPath, config: this.getConfig() })
        vscode.window.showInformationMessage("Export markdown to pdf success!")
    }

    public getConfig(type?:string) {
        return {
            "type": type||"pdf" ,
            "outputDirectory": "",
            "outputDirectoryRelativePathFile": false,
            "styles": [],
            "stylesRelativePathFile": false,
            "includeDefaultStyles": true,
            "highlight": true,
            "highlightStyle": "",
            "breaks": false,
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
    }

    private paths: { [index: string]: string } = {
        stable: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        beta: "C:\\Program Files (x86)\\Microsoft\\Edge Beta\\Application\\msedge.exe",
        dev: "C:\\Program Files (x86)\\Microsoft\\Edge Dev\\Application\\msedge.exe",
        canary: join(homedir(), "AppData\\Local\\Microsoft\\Edge SxS\\Application\\msedge.exe"),
    }

    private getChromiumPath() {
        for (const pathName in this.paths) {
            const path = this.paths[pathName];
            if (existsSync(path)) {
                console.debug(`using edge path is ${path}`)
                return path;
            }
        }
        try {
            const chromePath = require('chrome-finder')();
            console.debug(`using chrome path is ${chromePath}`)
            return chromePath;
        } catch (e) {
            vscode.window.showErrorMessage("Not chromium found, export fail.")
            throw new Error()
        }
    }

}