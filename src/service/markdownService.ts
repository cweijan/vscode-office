import { adjustImgPath, FileUtil } from "@/common/fileUtil";
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
import { Global, i18n } from "@/common/global";
import { TelemetryService } from "./telemetryService";

export type ExportType = 'pdf' | 'html' | 'docx';

export interface ExportLayoutSettings {
    fontSize: string;
    fontFamily: string;
    lineHeight: string;
    pageWidth: string;
    codeFontFamily: string;
}

export interface CodeThemeColors {
    bg: string;
    fg: string;
    comment: string;
    keyword: string;
    string: string;
    number: string;
    atom: string;
    property: string;
    attribute: string;
    variable: string;
    def: string;
    bracket: string;
    tag: string;
    link: string;
    error: string;
}

export interface ExportThemeSettings {
    editorTheme: string;
    isDark: boolean;
    codeMirrorTheme?: string;
    mermaidTheme?: string;
    globalSettings: Record<string, boolean | number | string | undefined>;
    cssVariables: Record<string, string>;
    layout: ExportLayoutSettings;
    codeThemeColors?: CodeThemeColors;
}

interface ExportOption {
    type?: ExportType;
    withoutOutline?: boolean;
    printBackground?: boolean;
    format?: string;
    useProExport?: boolean;
    exportTheme?: ExportThemeSettings;
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
        TelemetryService.get()?.trackMarkdownExport(type);
        try {
            if (type != 'html') { // html导出速度快, 无需等待
                vscode.window.showInformationMessage(i18n('ext.markdown.exportStart', type))
            }
            await convertMd({ markdownFilePath: uri.fsPath, config: this.getConfig(option) })
            const outputUri = vscode.Uri.file(join(dirname(uri.fsPath), `${parse(uri.fsPath).name}.${type}`));
            FileUtil.genFileSuccess(i18n('ext.markdown.exportSuccess', type), outputUri);
        } catch (error) {
            Output.log(error)
        }
    }

    public getConfig(option: ExportOption) {
        const top = Global.getConfig("pdfMarginTop")
        const { type = 'pdf', withoutOutline = false, useProExport = false } = option;
        return {
            type,
            "styles": [],
            withoutOutline,
            useProExport,
            exportTheme: useProExport ? option.exportTheme : undefined,
            // chromium path
            "executablePath": this.getChromiumPath(),
            // puppeteer launch args (useful for Linux servers running as root)
            "puppeteerArgs": this.getPuppeteerArgs(),
            // Set `true` to convert `\n` in paragraphs into `<br>`.
            "breaks": false,
            // pdf print option
            "printBackground": option.printBackground ?? true,
            format: option.format ?? "A4",
            margin: { top }
        };
    }

    private getPuppeteerArgs(): string[] {
        // Custom args from settings
        const customArgs = Global.getConfig<string[]>("puppeteerArgs");
        if (customArgs && customArgs.length > 0) {
            return customArgs;
        }
        // On Linux, running as root requires --no-sandbox
        if (process.platform === 'linux') {
            try {
                const uid = typeof process.getuid === 'function' ? process.getuid() : -1;
                if (uid === 0) {
                    return ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'];
                }
            } catch {
                // getuid not available on this platform
            }
        }
        return [];
    }

    private paths: string[] = [
        // Windows
        "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        "C:\\Program Files (x86)\\Microsoft\\Edge Beta\\Application\\msedge.exe",
        "C:\\Program Files (x86)\\Microsoft\\Edge Dev\\Application\\msedge.exe",
        join(homedir(), "AppData\\Local\\Microsoft\\Edge SxS\\Application\\msedge.exe"),
        // macOS
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
        '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
        // Linux
        "/usr/bin/google-chrome",
        "/usr/bin/google-chrome-stable",
        "/usr/bin/chromium",
        "/usr/bin/chromium-browser",
        "/snap/bin/chromium",
        "/usr/bin/microsoft-edge",
    ]

    private getChromiumPath() {
        const chromiumPath = Global.getConfig<string>("chromiumPath")
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
            const msg = i18n('ext.markdown.noChromium');
            vscode.window.showErrorMessage(msg)
            throw new Error(msg)
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
        const info = adjustImgPath(uri, 'png'), { fullPath } = info;
        let { relPath } = info;
        const imagePath = isAbsolute(fullPath) ? fullPath : `${dirname(uri.fsPath)}/${relPath}`.replace(/\\/g, "/");
        this.createImgDir(imagePath);
        this.saveClipboardImageToFileAndGetPath(imagePath, async (savedImagePath) => {
            if (!savedImagePath) return;
            if (savedImagePath === 'no image') {
                vscode.window.showErrorMessage(i18n('ext.markdown.noClipboardImage'));
                return;
            }
            this.copyFromPath(savedImagePath, imagePath);
            const editor = vscode.window.activeTextEditor;
            const imgName = parse(relPath).name;
            relPath = await MarkdownService.imgExtGuide(imagePath, relPath);
            if (editor) {
                editor?.edit(edit => {
                    const current = editor.selection;
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

    public static async imgExtGuide(absPath: string, relPath: string) {
        const oldExt = extname(absPath)
        const { ext = "png" } = (await fileTypeFromFile(absPath)) ?? {};
        if (oldExt != `.${ext}`) {
            relPath = relPath.replace(oldExt, `.${ext}`)
            renameSync(absPath, absPath.replace(oldExt, `.${ext}`))
        }
        return relPath
    }

    /**
     * 如果粘贴板内是复制了一个文件, 取得路径进行复制
     */
    private copyFromPath(savedImagePath: string, targetPath: string) {
        if (savedImagePath.startsWith("copied:")) {
            const copiedFile = savedImagePath.replace("copied:", "");
            if (lstatSync(copiedFile).isDirectory()) {
                vscode.window.showErrorMessage(i18n('ext.markdown.noPasteDirectory'));
            } else {
                copyFileSync(copiedFile, targetPath);
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
        const platform = process.platform;
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
            const scriptPath = path.join(this.context.extensionPath, './lib/mac.applescript');
            const ascript = spawn('osascript', [scriptPath, imagePath]);
            ascript.on('exit', function (code, signal) {
            });
            ascript.stdout.on('data', function (data) {
                cb(data.toString().trim());
            });
        } else {
            // Linux 
            const scriptPath = path.join(this.context.extensionPath, './lib/linux.sh');

            const ascript = spawn('sh', [scriptPath, imagePath]);
            ascript.on('exit', function (code, signal) {
            });
            ascript.stdout.on('data', function (data) {
                const result = data.toString().trim();
                if (result == "no xclip") {
                    vscode.window.showInformationMessage(i18n('ext.markdown.installXclip'));
                    return;
                }
                cb(result);
            });
        }
    }

    public switchEditor(uri: vscode.Uri) {
        const editor = vscode.window.activeTextEditor;
        if (!uri) uri = editor?.document.uri;
        const type = editor ? 'cweijan.markdownViewer' : 'default';
        vscode.commands.executeCommand('vscode.openWith', uri, type);
    }

}
