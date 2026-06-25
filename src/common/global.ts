import * as vscode from 'vscode';
import { ExtensionContext } from 'vscode';
import { initI18n, localize } from './vscode-nls-i18n';

const prefix = 'vscode-office';

export function language() {
    return vscode.env.language;
}

export function i18n(key: string, ...args: string[]) {
    return localize(key, ...args);
}

export class Global {
    public static context: ExtensionContext;

    public static init(context: ExtensionContext) {
        Global.context = context;
        initI18n(context.extensionPath);
    }

    /**
     * get configuration from vscode setting.
     * @param key config key
     */
    public static getConfig<T>(key: string, defaultValue?: T): T {
        const config = vscode.workspace.getConfiguration(prefix);
        return config.get<T>(key, defaultValue);
    }

    /**
     * update config for vscode, config must def in package.json.
     * @param name  config name
     * @param value config value
     */
    public static async updateConfig(name: string, value: any) {
        const config = vscode.workspace.getConfiguration(prefix);
        const meta = config.inspect(name);
        const newValue = meta?.defaultValue == value ? undefined : value;
        await config.update(name, newValue, true);
    }
}
