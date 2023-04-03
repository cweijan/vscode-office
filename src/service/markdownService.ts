import { adjustImgPath } from "@/common/fileUtil";
import { Output } from "@/common/Output";
import { spawn } from 'child_process';
import chromeFinder from 'chrome-finder';
import { fileTypeFromFile } from 'file-type';
import { copyFileSync, existsSync, lstatSync, mkdirSync, renameSync } from 'fs';
import { homedir } from 'os';
import path, { dirname, extname, isAbsolute, join, parse } from 'path';
import * as vscode from 'vscode';
import { Holder } from './markdown/holder';
import { convertMd } from "./markdown/markdown-pdf";

export type ExportType = 'pdf' | 'html' | 'docx';

interface ExportOption {
    type?: ExportType;
    withoutOutline?: boolean;
}

export class MarkdownService {

    constructor(private context: vscode.ExtensionContext) {
    }

    /**
     * export markdown to another type
     * @param type pdf, html, docx 
     */
    public async exportMarkdown(uri: vscode.Uri, option: ExportOption = {}) {
        const { type = 'pdf' } = option;
        try {
            if (type != 'html') { // html导出速度快, 无需等待
                vscode.window.showInformationMessage(`Starting export markdown to ${type}.`)
            }
            await convertMd({ markdownFilePath: uri.fsPath, config: this.getConfig(option) })
            vscode.window.showInformationMessage(`Export markdown to ${type} success!`)
        } catch (error) {
            Output.log(error)
        }
    }

    public getConfig(option: ExportOption) {
        const config = vscode.workspace.getConfiguration("vscode-office");
        const top = config.get("pdfMarginTop")
        const { type = 'pdf', withoutOutline = false } = option;
        return {
            type,
            "styles": [],
            withoutOutline,
            // chromium path
            "executablePath": this.getChromiumPath(),
            // Set `true` to convert `\n` in paragraphs into `<br>`.
            "breaks": false,
            // pdf print option
            "printBackground": true,
            format: "A4",
            margin: { top }
        };
    }

    private paths: string[] = [
        "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        "C:\\Program Files (x86)\\Microsoft\\Edge Beta\\Application\\msedge.exe",
        "C:\\Program Files (x86)\\Microsoft\\Edge Dev\\Application\\msedge.exe",
        join(homedir(), "AppData\\Local\\Microsoft\\Edge SxS\\Application\\msedge.exe"),
        "/Applications/Microsoft/Edge.app",
        "/usr/bin/microsoft-edge",
    ]

    private getChromiumPath() {
        const chromiumPath = vscode.workspace.getConfiguration("vscode-office").get<string>("chromiumPath")
        const paths = [chromiumPath, ...this.paths]
        for (const path of paths) {
            if (existsSync(path)) {
                console.debug(`using chromium path is ${path}`)
                return path;
            }
        }
        try {
            const chromePath = chromeFinder();
            console.debug(`using chrome path is ${chromePath}`)
            return chromePath;
        } catch (e) {
            vscode.window.showErrorMessage("Not chromium found, export fail.")
            throw new Error()
        }
    }

    public async loadClipboardImage() {

        const document = vscode.window.activeTextEditor?.document || Holder.activeDocument
        if (await vscode.env.clipboard.readText()) {
            vscode.commands.executeCommand("editor.action.clipboardPasteAction")
            return
        }

        if (!document || document.isUntitled || document.isClosed) {
            return
        }

        const uri = document.uri;
        let { relPath, fullPath } = adjustImgPath(uri)
        const imagePath = isAbsolute(fullPath) ? fullPath : `${dirname(uri.fsPath)}/${relPath}`.replace(/\\/g, "/");
        this.createImgDir(imagePath);
        this.saveClipboardImageToFileAndGetPath(imagePath, async (savedImagePath) => {
            if (!savedImagePath) return;
            if (savedImagePath === 'no image') {
                vscode.window.showErrorMessage('There is not an image in the clipboard.');
                return;
            }
            this.copyFromPath(savedImagePath, imagePath);
            const editor = vscode.window.activeTextEditor;
            const imgName = parse(relPath).name;
            const oldExt = extname(imagePath)
            const { ext = "png" } = (await fileTypeFromFile(imagePath)) ?? {};
            if (oldExt != `.${ext}`) {
                relPath = relPath.replace(oldExt, `.${ext}`)
                renameSync(imagePath, imagePath.replace(oldExt, `.${ext}`))
            }
            if (editor) {
                editor?.edit(edit => {
                    let current = editor.selection;
                    if (current.isEmpty) {
                        edit.insert(current.start, `![${imgName}](${relPath})`);
                    } else {
                        edit.replace(current, `![${imgName}](${relPath})`);
                    }
                });
            } else {
                vscode.env.clipboard.writeText(`![${imgName}](${relPath})`)
                vscode.commands.executeCommand("editor.action.clipboardPasteAction")
            }
        })
    }

    /**
     * 如果粘贴板内是复制了一个文件, 取得路径进行复制
     */
    private copyFromPath(savedImagePath: string, targetPath: string) {
        if (savedImagePath.startsWith("copyed:")) {
            const copyedFile = savedImagePath.replace("copyed:", "");
            if (lstatSync(copyedFile).isDirectory()) {
                vscode.window.showErrorMessage('Not support paste directory.');
            } else {
                copyFileSync(copyedFile, targetPath);
            }
        }
    }

    private createImgDir(imagePath: string) {
        const dir = path.dirname(imagePath);
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
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
