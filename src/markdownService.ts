// const prettyMdPdf = require("pretty-markdown-pdf")
import { spawn } from 'child_process';
import { accessSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { dirname, join, parse, resolve } from 'path';
import * as vscode from 'vscode';
import { Holder } from './holder';
import path = require('path');

export class MarkdownService {

    private configPath: string;

    constructor(private context: vscode.ExtensionContext) {
        this.configPath = context.globalStoragePath + "/config.json"
    }

    public exportPdf(uri: vscode.Uri) {
         vscode.window.showErrorMessage("Unsupport now!")
        // vscode.window.showInformationMessage("Starting export markdown to pdf.")
        // this.bulidConfig();
        // prettyMdPdf.convertMd({ markdownFilePath: uri.fsPath, configFilePath: this.configPath })
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
        const dir = dirname(this.configPath)
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true })
        }
        const configStr = JSON.stringify(config);
        console.debug(`export markdown config is ${configStr}`)
        writeFileSync(this.configPath, configStr)
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
        try{
            const chromePath = require('chrome-finder')();
            console.debug(`using chrome path is ${chromePath}`)
            return chromePath;
        }catch(e){
            vscode.window.showErrorMessage("Not chromium found, export fail.")
            throw new Error()
        }
    }

    public async loadClipboardImage(document?: vscode.TextDocument) {
        if (!document) {
            vscode.commands.executeCommand("editor.action.clipboardPasteAction")
        } else if (parse(document.uri.fsPath).ext.toLowerCase() != ".md") {
            vscode.commands.executeCommand("editor.action.clipboardPasteAction")
            return
        }

        if (await vscode.env.clipboard.readText() == "") {
            const uri: vscode.Uri | null = document ? document.uri : Holder.activeUrl
            if (uri == null) {
                return
            }
            const rePath = `image/${parse(uri.fsPath).name}/${new Date().getTime()}.png`;
            const imagePath = `${resolve(uri.fsPath, "..")}/${rePath}`.replace(/\\/g, "/");
            const dir = path.dirname(imagePath)
            if (!existsSync(dir)) {
                mkdirSync(dir, { recursive: true })
            }
            this.saveClipboardImageToFileAndGetPath(imagePath, (savedImagePath) => {
                if (!savedImagePath) return;
                if (savedImagePath === 'no image') {
                    vscode.window.showInformationMessage('There is not an image in the clipboard.');
                    return;
                }
                const editor = vscode.window.activeTextEditor;
                if (editor) {
                    editor?.edit(edit => {
                        let current = editor.selection;
                        if (current.isEmpty) {
                            edit.insert(current.start, `![](${rePath})`);
                        } else {
                            edit.replace(current, `![](${rePath})`);
                        }
                    });
                } else {
                    vscode.env.clipboard.writeText(`![](${rePath})`)
                    vscode.commands.executeCommand("editor.action.clipboardPasteAction")
                }
            })
        } else {
            if (document) {
                vscode.commands.executeCommand("editor.action.clipboardPasteAction")
            }
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