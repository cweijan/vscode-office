import { convertMd } from "./markdown/markdown-pdf";
import { spawn } from 'child_process';
import { copyFileSync, existsSync, lstatSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { basename, isAbsolute, join, parse, resolve } from 'path';
import * as vscode from 'vscode';
import { Holder } from './markdown/holder';
import path = require('path');
import { DomUtils } from "htmlparser2";
import { Output } from "@/common/Output";

export class MarkdownService {

    constructor(private context: vscode.ExtensionContext) {
    }

    public async exportPdfToHtml(uri: vscode.Uri) {
        await convertMd({ markdownFilePath: uri.fsPath, config: this.getConfig('html') })
        vscode.window.showInformationMessage("Export markdown to html success!")
    }

    public async exportPdf(uri: vscode.Uri) {
        try {
            vscode.window.showInformationMessage("Starting export markdown to pdf.")
            await convertMd({ markdownFilePath: uri.fsPath, config: this.getConfig() })
            vscode.window.showInformationMessage("Export markdown to pdf success!")
        } catch (error) {
            Output.log(error)
        }
    }

    public getConfig(type?: string) {
        return {
            "type": type || "pdf",
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
        linux: "/usr/bin/microsoft-edge",
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

    public async loadClipboardImage() {
        const document = vscode.window.activeTextEditor?.document || Holder.activeDocument

        if (await vscode.env.clipboard.readText() == "") {
            if (!document || document.isUntitled || document.isClosed) {
                return
            }
            const uri: vscode.Uri = document.uri;
            let rePath = vscode.workspace.getConfiguration("vscode-office").get<string>("pasterImgPath");
            rePath = rePath.replace("${fileName}", parse(uri.fsPath).name).replace("${now}", new Date().getTime() + "")
            const imagePath = isAbsolute(rePath) ? rePath : `${resolve(uri.fsPath, "..")}/${rePath}`.replace(/\\/g, "/");
            const dir = path.dirname(imagePath)
            if (!existsSync(dir)) {
                mkdirSync(dir, { recursive: true })
            }
            this.saveClipboardImageToFileAndGetPath(imagePath, (savedImagePath) => {
                if (!savedImagePath) return;
                if (savedImagePath === 'no image') {
                    vscode.window.showErrorMessage('There is not an image in the clipboard.');
                    return;
                }
                if (savedImagePath.startsWith("copyed:")) {
                    const copyedFile = savedImagePath.replace("copyed:", "");
                    if (!existsSync(copyedFile)) {
                        vscode.window.showErrorMessage(`Coped file ${copyedFile} not found!`);
                        return;
                    }
                    if (lstatSync(copyedFile).isDirectory()) {
                        vscode.window.showErrorMessage('Not support paster directory.');
                    } else {
                        copyFileSync(copyedFile, imagePath)
                    }
                }
                const editor = vscode.window.activeTextEditor;
                const imgName=parse(rePath).name;
                if (editor) {
                    editor?.edit(edit => {
                        let current = editor.selection;
                        if (current.isEmpty) {
                            edit.insert(current.start, `![${imgName}](${rePath})`);
                        } else {
                            edit.replace(current, `![${imgName}](${rePath})`);
                        }
                    });
                } else {
                    vscode.env.clipboard.writeText(`![${imgName}](${rePath})`)
                    vscode.commands.executeCommand("editor.action.clipboardPasteAction")
                }
            })
        } else {
            vscode.commands.executeCommand("editor.action.clipboardPasteAction")
        }

    }

    private saveClipboardImageToFileAndGetPath(imagePath: string, cb: (value: string) => void) {
        if (!imagePath) return;
        let platform = process.platform;
        if (platform === 'win32') {
            // Windows
            const scriptPath = path.join(this.context.extensionPath, '/lib/pc.ps1');
            const powershell = spawn('powershell', [
                '-noprofile',
                '-noninteractive',
                '-nologo',
                '-sta',
                '-executionpolicy', 'unrestricted',
                '-windowstyle', 'hidden',
                '-file', scriptPath,
                imagePath
            ]);
            powershell.on('exit', function (code, signal) {
            });
            powershell.stdout.on('data', function (data) {
                cb(data.toString().trim());
            });
        } else if (platform === 'darwin') {
            // Mac
            let scriptPath = path.join(this.context.extensionPath, './lib/mac.applescript');
            let ascript = spawn('osascript', [scriptPath, imagePath]);
            ascript.on('exit', function (code, signal) {
            });
            ascript.stdout.on('data', function (data) {
                cb(data.toString().trim());
            });
        } else {
            // Linux 
            let scriptPath = path.join(this.context.extensionPath, './lib/linux.sh');

            let ascript = spawn('sh', [scriptPath, imagePath]);
            ascript.on('exit', function (code, signal) {
            });
            ascript.stdout.on('data', function (data) {
                let result = data.toString().trim();
                if (result == "no xclip") {
                    vscode.window.showInformationMessage('You need to install xclip command first.');
                    return;
                }
                cb(result);
            });
        }
    }

}
