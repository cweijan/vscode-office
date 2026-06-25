import { adjustImgPath, getWorkspacePath } from '@/common/fileUtil';
import { basename, isAbsolute, parse, resolve } from 'path';
import * as vscode from 'vscode';
import { extensionResource, getExtensionResourceRoots, readExtensionText } from '@/common/extensionResource';
import { ensureParentDirectory } from '@/common/workspaceFs';
import { Handler } from '../common/handler';
import { Util } from '../common/util';
import { Holder } from '../service/markdown/holder';
import { MarkdownService } from '../service/markdownService';
import { Global, i18n } from '@/common/global';
import { TelemetryService } from '@/service/telemetryService';
import { openWikiLink } from '@/service/markdown/wikilink';
import { streamCustomAI } from '@/service/ai/customAIClient';
import {
    consumePendingBlockScroll,
    registerMarkdownWebview,
    unregisterMarkdownWebview,
} from '@/service/markdown/blockScroll';
import { fileTypeFromPath } from '@/service/officeViewType';

function getRuntimePlatform(): string {
    if (typeof process !== 'undefined' && process.platform) {
        return process.platform;
    }
    return 'web';
}

export interface MarkdownEditorProviderOptions {
    isWeb?: boolean;
}

/**
 * support view and edit office files.
 */
export class MarkdownEditorProvider implements vscode.CustomTextEditorProvider {

    private static legacyGlobalStatePurged = false;

    private countStatus: vscode.StatusBarItem;
    private aiAbortController: AbortController | null = null;
    private aiCancellationSource: vscode.CancellationTokenSource | null = null;

    constructor(
        private context: vscode.ExtensionContext, private options: MarkdownEditorProviderOptions = {}
    ) {
        this.countStatus = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.purgeLegacyGlobalState();
    }

    private purgeLegacyGlobalState() {
        if (MarkdownEditorProvider.legacyGlobalStatePurged) {
            return;
        }
        MarkdownEditorProvider.legacyGlobalStatePurged = true;
        const state = this.context.globalState;
        for (const key of state.keys()) {
            if (key.startsWith('scrollTop_')) {
                void state.update(key, undefined);
            }
        }
    }

    private getFolders(): vscode.Uri[] {
        if (vscode.env.uiKind === vscode.UIKind.Web) {
            return [];
        }
        const data = [];
        for (let i = 65; i <= 90; i++) {
            data.push(vscode.Uri.file(`${String.fromCharCode(i)}:/`))
        }
        return data;
    }

    resolveCustomTextEditor(document: vscode.TextDocument, webviewPanel: vscode.WebviewPanel, token: vscode.CancellationToken): void | Thenable<void> {
        // console.log('schema', document.uri.scheme, document.uri.path, document.uri.query);
        const uri = document.uri;
        const webview = webviewPanel.webview;
        const folderPath = vscode.Uri.joinPath(uri, '..')
        webview.options = {
            enableScripts: true,
            localResourceRoots: [
                ...getExtensionResourceRoots(this.context),
                vscode.Uri.file("/"),
                ...this.getFolders(),
            ],
        }
        const handler = Handler.bind(webviewPanel, uri);
        TelemetryService.get()?.trackViewOpen('markdown', fileTypeFromPath(uri.fsPath));
        void this.handleMarkdown(document, handler, folderPath);
        handler.on('developerTool', () => vscode.commands.executeCommand('workbench.action.toggleDevTools'))
    }

    private async handleMarkdown(document: vscode.TextDocument, handler: Handler, folderPath: vscode.Uri) {

        const uri = document.uri;
        const webview = handler.panel.webview;

        let content = document.getText();
        const contextUri = extensionResource(this.context, 'resource', 'markdown');
        const rootPath = webview.asWebviewUri(contextUri).toString();

        Holder.activeDocument = document;
        handler.panel.onDidChangeViewState(e => {
            Holder.activeDocument = e.webviewPanel.visible ? document : Holder.activeDocument
            if (e.webviewPanel.visible) {
                this.updateCount(content)
                this.countStatus.show()
            } else {
                this.countStatus.hide()
            }
        });

        let lastManualSaveTime: number;
        const config = vscode.workspace.getConfiguration("vscode-office");
        registerMarkdownWebview(uri, handler);
        handler.panel.onDidDispose(() => {
            unregisterMarkdownWebview(uri);
        });
        handler.on("init", () => {
            handler.emit("open", {
                content, rootPath,
                documentCacheId: `${uri.scheme}:${uri.toString()}`,
                pendingFragment: consumePendingBlockScroll(uri),
                config: this.getMarkdownWebviewConfig(config),
            })
            this.updateCount(content)
            this.countStatus.show()
        }).on("externalUpdate", e => {
            if (lastManualSaveTime && Date.now() - lastManualSaveTime < 800) return;
            const updatedText = e.document.getText()?.replace(/\r/g, '');
            if (content == updatedText) return;
            content = updatedText;
            this.updateCount(content)
            handler.emit("update", updatedText)
        }).on("command", (command) => {
            vscode.commands.executeCommand(command)
        }).on("openLink", async (linkUri: string) => {
            if (linkUri.startsWith('wiki:')) {
                await openWikiLink(uri, linkUri);
                return;
            }
            const resReg = /https:\/\/file.*\.net/i;
            if (linkUri.match(resReg)) {
                const localPath = linkUri.replace(resReg, '')
                vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(localPath));
            } else {
                vscode.env.openExternal(vscode.Uri.parse(linkUri));
            }
        }).on("codeMirrorTheme", (theme: string) => {
            const validThemes = [
                "Auto", "default",
                "Github", "Solarized Light", "Material Light", "Quiet Light", "One Light",
                "Dracula", "Monokai", "One Dark", "Solarized Dark", "Material Dark",
            ];
            if (validThemes.includes(theme)) {
                Global.updateConfig("codeMirrorTheme", theme === "default" ? "Auto" : theme);
            }
        }).on("editorTheme", (theme: string) => {
            const validThemes = [
                "Auto", "Light", "Solarized", "Warm Light", "Dim Light",
                "One Dark", "Github Dark", "Nord", "Monokai", "Dracula",
            ];
            if (validThemes.includes(theme)) {
                Global.updateConfig("editorTheme", theme);
            }
        }).on("mermaidTheme", (theme: string) => {
            const validThemes = [
                "Auto", "Light", "Forest", "Ocean", "Sunset",
                "Dark", "Dracula", "Monokai", "Nord",
            ];
            if (validThemes.includes(theme)) {
                Global.updateConfig("mermaidTheme", theme);
            }
        }).on("editMode", (mode: string) => {
            if (mode === "wysiwyg" || mode === "ir") {
                Global.updateConfig("editMode", mode);
            }
        }).on("img", async (payload) => {
            const imgData: string = typeof payload === 'string' ? payload : payload.data;
            const ext: string = typeof payload === 'string' ? 'png' : (payload.ext || 'png');
            const { relPath, fullPath } = adjustImgPath(uri, ext);
            const imagePath = isAbsolute(fullPath) ? fullPath : `${resolve(uri.fsPath, "..")}/${relPath}`.replace(/\\/g, "/");
            const imageUri = vscode.Uri.file(imagePath);
            await ensureParentDirectory(imageUri);
            await vscode.workspace.fs.writeFile(imageUri, Uint8Array.from(Buffer.from(imgData, 'binary')));
            const fileName = parse(relPath).name;
            const adjustRelPath = await MarkdownService.imgExtGuide(imagePath, relPath);
            vscode.env.clipboard.writeText(`![${fileName}](${adjustRelPath})`);
            vscode.commands.executeCommand("editor.action.clipboardPasteAction");
        }).on("insertImage", async () => {
            const files = await vscode.window.showOpenDialog({
                canSelectMany: false,
                filters: { Images: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'] },
                title: i18n('ext.markdown.selectImage'),
            });
            if (!files || files.length === 0) return;
            const sourceUri = files[0];
            const ext = parse(sourceUri.fsPath).ext.replace('.', '').toLowerCase() || 'png';
            const { relPath, fullPath } = adjustImgPath(uri, ext);
            const imagePath = isAbsolute(fullPath) ? fullPath : `${resolve(uri.fsPath, "..")}/${relPath}`.replace(/\\/g, "/");
            const imageUri = vscode.Uri.file(imagePath);
            await ensureParentDirectory(imageUri);
            const fileBytes = await vscode.workspace.fs.readFile(sourceUri);
            await vscode.workspace.fs.writeFile(imageUri, fileBytes);
            const fileName = parse(relPath).name;
            const adjustRelPath = await MarkdownService.imgExtGuide(imagePath, relPath);
            vscode.env.clipboard.writeText(`![${fileName}](${adjustRelPath})`);
            vscode.commands.executeCommand("editor.action.clipboardPasteAction");
        }).on("editInVSCode", (full: boolean) => {
            TelemetryService.get()?.trackEvent('markdown.editInVSCode', { full: full ? 'true' : 'false' });
            const side = full ? vscode.ViewColumn.Active : vscode.ViewColumn.Beside;
            vscode.commands.executeCommand('vscode.openWith', uri, "default", side);
        }).on("showInFolder", () => {
            if (vscode.env.uiKind !== vscode.UIKind.Web) {
                vscode.commands.executeCommand('revealFileInOS', uri);
            }
        }).on("save", (newContent) => {
            if (lastManualSaveTime && Date.now() - lastManualSaveTime < 800) return;
            content = newContent
            this.updateTextDocument(document, newContent)
            this.updateCount(content)
        }).on("doSave", async (content) => {
            lastManualSaveTime = Date.now();
            await this.updateTextDocument(document, content)
            this.updateCount(content)
            vscode.commands.executeCommand('workbench.action.files.save');
        }).on("export", (option) => {
            vscode.commands.executeCommand('workbench.action.files.save');
            new MarkdownService(this.context).exportMarkdown(uri, option)
        }).on('developerTool', () => {
            vscode.commands.executeCommand('workbench.action.toggleDevTools')
        }).on('openAbout', () => {
            TelemetryService.get()?.trackMarkdownSponsorOpen();
        }).on('openSponsor', () => {
            TelemetryService.get()?.trackMarkdownSponsorClick('logo');
            vscode.commands.executeCommand(
                'workbench.extensions.action.showExtensionsWithIds',
                ['cweijan.vscode-database-client2'],
            );
        }).on('openExternal', (url: string) => {
            if (url) {
                if (url.includes('database-client.com')) {
                    TelemetryService.get()?.trackMarkdownSponsorClick('site');
                }
                vscode.env.openExternal(vscode.Uri.parse(url));
            }
        }).on('queryAIAvailable', () => {
            void this.notifyAIAvailable(handler);
        }).on('queryVSCodeModels', async () => {
            const lm = (vscode as any).lm;
            if (typeof lm?.selectChatModels !== 'function') {
                handler.emit('vscodeModels', []);
                return;
            }
            try {
                const models: any[] = await lm.selectChatModels();
                handler.emit('vscodeModels', (models ?? []).map((m: any) => ({
                    id: m.id,
                    name: m.name,
                    family: m.family,
                    vendor: m.vendor,
                })));
            } catch {
                handler.emit('vscodeModels', []);
            }
        }).on('aiPolish', async (payload: { markdown: string; options?: any }) => {
            await this.handleAIPolish(handler, payload.markdown, payload.options);
        }).on('aiPolishCancel', () => {
            this.cancelAIPolish();
        }).on('telemetry', (payload: { event: string; properties?: Record<string, string | number | boolean> }) => {
            TelemetryService.get()?.trackEvent(payload.event, payload.properties);
        })

        const basePath = Global.getConfig('workspacePathAsImageBasePath') ?
            vscode.Uri.file(getWorkspacePath(folderPath)) : folderPath;
        const baseUrl = webview.asWebviewUri(basePath).toString().replace(/\?.+$/, '').replace('https://git', 'https://file');
        const indexHtml = await readExtensionText(this.context, 'resource', 'markdown', 'index.html');
        webview.html = Util.buildPath(
            indexHtml.replace("{{baseUrl}}", baseUrl), webview, contextUri
        );
    }

    private cancelAIPolish() {
        this.aiCancellationSource?.cancel();
        this.aiAbortController?.abort();
    }

    private async notifyAIAvailable(handler: Handler) {
        const lm = (vscode as any).lm;
        const available = typeof lm?.selectChatModels === 'function';
        handler.emit('aiAvailable', available);
    }

    private buildPolishPrompt(markdown: string, options?: any): string {
        const parts: string[] = [];
        parts.push('You are a writing assistant.');
        if (options?.prompt) {
            parts.push(options.prompt);
        } else {
            parts.push('Polish the following Markdown text: improve clarity, fix grammar, and enhance readability.');
        }
        if (options?.goal) {
            parts.push(`Focus on: ${options.goal}`);
        }
        parts.push('Return ONLY the polished Markdown with no extra commentary.\n\n' + markdown);
        return parts.join('\n');
    }

    private async handleAIPolish(handler: Handler, markdown: string, options?: any) {
        const engine = options?.engine ?? 'vscode';

        this.cancelAIPolish();
        this.aiCancellationSource = new vscode.CancellationTokenSource();
        this.aiAbortController = new AbortController();

        if (engine === 'custom') {
            await this.handleCustomAIPolish(handler, markdown, options);
            return;
        }

        const lm = (vscode as any).lm;
        if (typeof lm?.selectChatModels !== 'function') {
            vscode.window.showWarningMessage(i18n('ext.markdown.aiRequiresVscode'));
            handler.emit('aiPolishResult', markdown);
            return;
        }
        try {
            let model: any;
            if (options?.vscodeModelId) {
                const all: any[] = await lm.selectChatModels();
                model = all?.find((m: any) => m.id === options.vscodeModelId);
            }
            if (!model) {
                let models: any[] = await lm.selectChatModels({ family: 'gpt-4o' });
                if (!models || models.length === 0) {
                    models = await lm.selectChatModels();
                }
                if (!models || models.length === 0) {
                    vscode.window.showWarningMessage(i18n('ext.markdown.noAiModel'));
                    handler.emit('aiPolishEnd');
                    return;
                }
                model = models[0];
            }
            const LanguageModelChatMessage = (vscode as any).LanguageModelChatMessage;
            const messages = [LanguageModelChatMessage.User(this.buildPolishPrompt(markdown, options))];
            const token = this.aiCancellationSource.token;
            const response = await model.sendRequest(messages, {}, token);
            for await (const chunk of response.text) {
                if (token.isCancellationRequested) break;
                handler.emit('aiPolishChunk', chunk);
            }
            if (!token.isCancellationRequested) {
                handler.emit('aiPolishEnd');
            }
        } catch (err: any) {
            if (this.aiCancellationSource?.token.isCancellationRequested) return;
            vscode.window.showErrorMessage(i18n('ext.markdown.aiPolishFailed', String(err?.message ?? err)));
            handler.emit('aiPolishEnd');
        }
    }

    private async handleCustomAIPolish(handler: Handler, markdown: string, options: any) {
        const url = options?.customUrl?.trim();
        if (!url) {
            vscode.window.showWarningMessage(i18n('ext.markdown.customAiUrlRequired'));
            handler.emit('aiPolishResult', markdown);
            return;
        }
        try {
            await streamCustomAI({
                url,
                apiKey: options?.customKey?.trim(),
                model: options?.customModel?.trim(),
                format: options?.customApiFormat,
                prompt: this.buildPolishPrompt(markdown, options),
                signal: this.aiAbortController?.signal,
                onChunk: (chunk: string) => {
                    handler.emit('aiPolishChunk', chunk);
                },
            });
            handler.emit('aiPolishEnd');
        } catch (err: any) {
            if (err?.name === 'AbortError') return;
            vscode.window.showErrorMessage(i18n('ext.markdown.customAiPolishFailed', String(err?.message ?? err)));
            handler.emit('aiPolishEnd');
        }
    }

    private getMarkdownWebviewConfig(configuration: vscode.WorkspaceConfiguration) {
        const markdownConfiguration = vscode.workspace.getConfiguration("markdown");
        return {
            ...configuration,
            markdown: {
                math: {
                    macros: markdownConfiguration.get<Record<string, string>>("math.macros", {}),
                },
            },
            language: vscode.env.language,
            isWeb: this.options.isWeb,
            isDev: this.context.extensionMode === vscode.ExtensionMode.Development,
        };
    }

    private updateCount(content: string) {
        this.countStatus.text = i18n('ext.markdown.statusBar', String(content.split(/\r\n|\r|\n/).length), String(content.length))
    }

    private updateTextDocument(document: vscode.TextDocument, content: any) {
        const edit = new vscode.WorkspaceEdit();
        edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), content);
        return vscode.workspace.applyEdit(edit);
    }

}
