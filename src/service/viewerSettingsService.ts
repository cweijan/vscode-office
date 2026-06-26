import { homedir } from 'os';
import { join } from 'path';
import * as vscode from 'vscode';
import { broadcastToMarkdownWebviews } from '@/service/markdown/blockScroll';

const CONFIG_FILE_NAME = '.vscode-office-viewer.json';
const AI_PROMPTS_KEY = 'aiPrompts';
const AI_MODELS_KEY = 'aiModels';
const JSON_ARRAY_GLOBAL_KEYS = [AI_PROMPTS_KEY, AI_MODELS_KEY] as const;

export type ViewerSettingsPayload = Record<string, unknown>;

export type VditorViewerSettings = {
    globalSettings: Record<string, unknown>;
    aiPreferences?: Record<string, string>;
};

const serializeGlobalSettingsForFile = (globalSettings: Record<string, unknown>): Record<string, unknown> => {
    const result: Record<string, unknown> = { ...globalSettings };
    for (const key of JSON_ARRAY_GLOBAL_KEYS) {
        const value = result[key];
        if (typeof value === 'string' && value) {
            try {
                result[key] = JSON.parse(value);
            } catch {
                // keep original string
            }
        }
    }
    return result;
};

const deserializeGlobalSettingsForVditor = (globalSettings: Record<string, unknown> | undefined): Record<string, unknown> => {
    const result: Record<string, unknown> = { ...(globalSettings ?? {}) };
    for (const key of JSON_ARRAY_GLOBAL_KEYS) {
        const value = result[key];
        if (value !== undefined && typeof value !== 'string') {
            result[key] = JSON.stringify(value);
        }
    }
    return result;
};

export const serializeViewerSettingsForFile = (settings: VditorViewerSettings): ViewerSettingsPayload => ({
    globalSettings: serializeGlobalSettingsForFile(settings.globalSettings ?? {}),
    aiPreferences: settings.aiPreferences ?? {},
});

export const deserializeViewerSettingsFromFile = (payload: ViewerSettingsPayload | null | undefined): VditorViewerSettings | null => {
    if (!payload || typeof payload !== 'object') {
        return null;
    }
    return {
        globalSettings: deserializeGlobalSettingsForVditor(payload.globalSettings as Record<string, unknown> | undefined),
        aiPreferences: (payload.aiPreferences as Record<string, string> | undefined) ?? {},
    };
};

export class ViewerSettingsService {
    private static saveSubscription: vscode.Disposable | undefined;
    private static lastBroadcastJson = '';

    static getConfigUri(): vscode.Uri | undefined {
        if (vscode.env.uiKind === vscode.UIKind.Web) {
            return undefined;
        }
        const home = homedir();
        if (!home) {
            return undefined;
        }
        return vscode.Uri.file(join(home, CONFIG_FILE_NAME));
    }

    static isConfigDocument(document: vscode.TextDocument): boolean {
        const uri = this.getConfigUri();
        return !!uri && document.uri.fsPath === uri.fsPath;
    }

    static async exists(): Promise<boolean> {
        const uri = this.getConfigUri();
        if (!uri) {
            return false;
        }
        try {
            await vscode.workspace.fs.stat(uri);
            return true;
        } catch {
            return false;
        }
    }

    static async readRaw(): Promise<ViewerSettingsPayload | null> {
        const uri = this.getConfigUri();
        if (!uri) {
            return null;
        }
        try {
            const raw = await vscode.workspace.fs.readFile(uri);
            const parsed = JSON.parse(Buffer.from(raw).toString('utf8'));
            return parsed && typeof parsed === 'object' ? parsed as ViewerSettingsPayload : null;
        } catch {
            return null;
        }
    }

    static async readForVditor(): Promise<VditorViewerSettings | null> {
        return deserializeViewerSettingsFromFile(await this.readRaw());
    }

    static async writeFromVditor(settings: VditorViewerSettings): Promise<void> {
        await this.writePayload(serializeViewerSettingsForFile(settings));
    }

    static async writePayload(payload: ViewerSettingsPayload): Promise<void> {
        const uri = this.getConfigUri();
        if (!uri) {
            return;
        }
        const content = JSON.stringify(payload, null, 2);
        this.lastBroadcastJson = content;
        await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
    }

    private static broadcastFromDocumentText(text: string) {
        if (!text || text === this.lastBroadcastJson) {
            return;
        }
        let payload: ViewerSettingsPayload;
        try {
            payload = JSON.parse(text);
        } catch {
            return;
        }
        const settings = deserializeViewerSettingsFromFile(payload);
        if (!settings) {
            return;
        }
        this.lastBroadcastJson = text;
        broadcastToMarkdownWebviews('viewerSettings', settings);
    }

    static async createAndOpen(settings: VditorViewerSettings): Promise<void> {
        const uri = this.getConfigUri();
        if (!uri) {
            vscode.window.showWarningMessage('Viewer settings file is not supported in this environment.');
            return;
        }
        const existed = await this.exists();
        if (!existed) {
            await this.writeFromVditor(settings);
        }
        this.ensureSaveListener();
        const doc = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(doc, { preview: false });
        broadcastToMarkdownWebviews('viewerSettingsSync', { enabled: true });
    }

    static async loadForWebview(): Promise<{ enabled: boolean; settings?: VditorViewerSettings }> {
        if (!(await this.exists())) {
            return { enabled: false };
        }
        this.ensureSaveListener();
        const settings = await this.readForVditor();
        if (settings) {
            const raw = await this.readRaw();
            if (raw) {
                this.lastBroadcastJson = JSON.stringify(raw, null, 2);
            }
        }
        return { enabled: true, settings: settings ?? undefined };
    }

    static ensureSaveListener() {
        if (this.saveSubscription) {
            return;
        }
        this.saveSubscription = vscode.workspace.onDidSaveTextDocument((document) => {
            if (!this.isConfigDocument(document)) {
                return;
            }
            this.broadcastFromDocumentText(document.getText());
        });
    }

    static dispose() {
        this.saveSubscription?.dispose();
        this.saveSubscription = undefined;
    }
}
