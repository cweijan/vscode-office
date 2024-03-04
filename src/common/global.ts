import * as vscode from 'vscode';

const prefix='vscode-office';
export class Global {
    /**
     * get configuration from vscode setting.
     * @param key config key
     */
    public static getConfig<T>(key: string, defaultValue?: T): T {
        const config = vscode.workspace.getConfiguration(prefix);
        return config.get<T>(key, defaultValue);
    }
    /**
     * update mysql config for vscode, config must def in package.json.
     * @param name  config name
     * @param value config value
     */
    public static async updateConfig(name: string, value: any) {
        const config = vscode.workspace.getConfiguration(prefix);
        const meta = config.inspect(name)
        const newValue = meta?.defaultValue == value ? undefined : value;
        await config.update(name, newValue, true)
    }
}