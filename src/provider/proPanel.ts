import * as vscode from 'vscode';
import { getExtensionResourceRoots } from '../common/extensionResource';
import { ReactApp } from '../common/reactApp';

const VIEW_TYPE = 'office.proPanel';
const API_HOST = 'https://api.office-viewer.app';
const STATE_KEY = 'office.pro.licenseKey';

export class ProPanel {
    private static panel: vscode.WebviewPanel | undefined;

    public static async createOrShow(context: vscode.ExtensionContext) {
        if (this.panel) {
            this.panel.reveal();
            return;
        }

        this.panel = vscode.window.createWebviewPanel(
            VIEW_TYPE,
            'Office Viewer Pro',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: getExtensionResourceRoots(context),
            }
        );

        this.panel.iconPath = vscode.Uri.joinPath(context.extensionUri, 'image', 'logo.png');

        await ReactApp.view(this.panel.webview, { route: 'pro' });

        this.panel.onDidDispose(() => {
            this.panel = undefined;
        });

        this.panel.webview.onDidReceiveMessage(async (msg: { type: string; content?: any }) => {
            switch (msg.type) {
                case 'proGetCurrentKey': {
                    const key = context.globalState.get<string>(STATE_KEY) ?? null;
                    this.panel?.webview.postMessage({ type: 'proCurrentKey', content: key });
                    break;
                }
                case 'proActivate': {
                    await this.handleActivate(context, msg.content as string);
                    break;
                }
                case 'openLink': {
                    vscode.env.openExternal(vscode.Uri.parse(msg.content as string));
                    break;
                }
            }
        });
    }

    private static async handleActivate(context: vscode.ExtensionContext, key: string) {
        try {
            const res = await fetch(`${API_HOST}/office/license/activate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ licenseKey: key }),
            });
            if (res.ok) {
                const json = await res.json() as any;
                const data = json?.data ?? json;
                if (data?.licenseKey) {
                    await context.globalState.update(STATE_KEY, key);
                    this.panel?.webview.postMessage({ type: 'proActivateResult', content: { success: true, key } });
                    return;
                }
            }
            const errJson = await res.json().catch(() => null) as any;
            const errMsg = errJson?.message ?? errJson?.msg ?? 'Invalid license key.';
            this.panel?.webview.postMessage({ type: 'proActivateResult', content: { success: false, error: errMsg } });
        } catch {
            this.panel?.webview.postMessage({ type: 'proActivateResult', content: { success: false, error: 'Network error, please try again.' } });
        }
    }

    public static getLicenseKey(context: vscode.ExtensionContext): string | undefined {
        return context.globalState.get<string>(STATE_KEY);
    }
}
