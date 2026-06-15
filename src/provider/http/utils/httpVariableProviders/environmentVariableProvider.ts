import { ResolveErrorMessage } from '../../models/httpVariableResolveResult';
import { VariableType } from '../../models/types';
import { HttpVariable, HttpVariableProvider } from './httpVariableProvider';

export class EnvironmentVariableProvider implements HttpVariableProvider {
    private static _instance: EnvironmentVariableProvider;

    public static get Instance(): EnvironmentVariableProvider {
        if (!this._instance) {
            this._instance = new EnvironmentVariableProvider();
        }

        return this._instance;
    }

    private constructor() {
    }

    public readonly type: VariableType = VariableType.Environment;

    public async has(name: string): Promise<boolean> {
        const variables = await this.getAvailableVariables();
        return name in variables;
    }

    public async get(name: string): Promise<HttpVariable> {
        const variables = await this.getAvailableVariables();
        if (!(name in variables)) {
            return { name, error: ResolveErrorMessage.EnvironmentVariableNotExist };
        }

        return { name, value: variables[name] };
    }

    public async getAll(): Promise<HttpVariable[]> {
        const variables = await this.getAvailableVariables();
        return Object.keys(variables).map(key => ({ name: key, value: variables[key] }));
    }

    private async getAvailableVariables(): Promise<{ [key: string]: string }> {
        return {};
    }

}