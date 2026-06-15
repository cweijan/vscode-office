import * as fs from 'fs';
import * as path from 'path';
import { TextDocument } from 'vscode';
import * as Constants from '../../common/constants';
import { ResolveErrorMessage, ResolveWarningMessage } from '../../models/httpVariableResolveResult';
import { VariableType } from '../../models/types';
import { EnvironmentVariableProvider } from './environmentVariableProvider';
import { HttpVariable, HttpVariableContext, HttpVariableProvider } from './httpVariableProvider';

function parseDotenv(content: string | Buffer): Record<string, string> {
    const text = typeof content === 'string' ? content : content.toString('utf8');
    const result: Record<string, string> = {};
    for (const line of text.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIndex = trimmed.indexOf('=');
        if (eqIndex === -1) continue;
        const key = trimmed.slice(0, eqIndex).trim();
        let value = trimmed.slice(eqIndex + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        result[key] = value;
    }
    return result;
}

type SystemVariableValue = Pick<HttpVariable, Exclude<keyof HttpVariable, 'name'>>;
type ResolveSystemVariableFunc = (name: string, document: TextDocument, context: HttpVariableContext) => Promise<SystemVariableValue>;

export class SystemVariableProvider implements HttpVariableProvider {

    private readonly resolveFuncs: Map<string, ResolveSystemVariableFunc> = new Map<string, ResolveSystemVariableFunc>();
    private readonly timestampRegex: RegExp = new RegExp(`\\${Constants.TimeStampVariableName}(?:\\s(\\-?\\d+)\\s(y|Q|M|w|d|h|m|s|ms))?`);
    private readonly randomIntegerRegex: RegExp = new RegExp(`\\${Constants.RandomIntVariableName}\\s(\\-?\\d+)\\s(\\-?\\d+)`);
    private readonly processEnvRegex: RegExp = new RegExp(`\\${Constants.ProcessEnvVariableName}\\s(\\%)?(\\w+)`);

    private readonly dotenvRegex: RegExp = new RegExp(`\\${Constants.DotenvVariableName}\\s(\\%)?([\\w-.]+)`);

    private readonly innerSettingsEnvironmentVariableProvider: EnvironmentVariableProvider = EnvironmentVariableProvider.Instance;
    private static _instance: SystemVariableProvider;

    public static get Instance(): SystemVariableProvider {
        if (!this._instance) {
            this._instance = new SystemVariableProvider();
        }

        return this._instance;
    }

    private constructor() {
        this.registerTimestampVariable();
        this.registerRandomIntVariable();
        this.registerProcessEnvVariable();
        this.registerDotenvVariable();
    }

    public readonly type: VariableType = VariableType.System;

    public async has(name: string, document: TextDocument): Promise<boolean> {
        const [variableName] = name.split(' ').filter(Boolean);
        return this.resolveFuncs.has(variableName);
    }

    public async get(name: string, document: TextDocument, context: HttpVariableContext): Promise<HttpVariable> {
        const [variableName] = name.split(' ').filter(Boolean);
        if (!this.resolveFuncs.has(variableName)) {
            return { name: variableName, error: ResolveErrorMessage.SystemVariableNotExist };
        }

        const result = await this.resolveFuncs.get(variableName)!(name, document, context);
        return { name: variableName, ...result };
    }

    public async getAll(document: undefined, context: HttpVariableContext): Promise<HttpVariable[]> {
        return [...this.resolveFuncs.keys()].map(name => ({ name }));
    }

    private registerTimestampVariable() {
        this.resolveFuncs.set(Constants.TimeStampVariableName, async name => {
            const groups = this.timestampRegex.exec(name);
            if (groups !== null && groups.length === 3) {
                return { value: `${Date.now()}` };
            }

            return { warning: ResolveWarningMessage.IncorrectTimestampVariableFormat };
        });
    }


    private registerRandomIntVariable() {
        this.resolveFuncs.set(Constants.RandomIntVariableName, async name => {
            const groups = this.randomIntegerRegex.exec(name);
            if (groups !== null && groups.length === 3) {
                const [, min, max] = groups;
                const minNum = Number(min);
                const maxNum = Number(max);
                if (minNum < maxNum) {
                    return { value: (Math.floor(Math.random() * (maxNum - minNum)) + minNum).toString() };
                }
            }

            return { warning: ResolveWarningMessage.IncorrectRandomIntegerVariableFormat };
        });
    }
    private registerProcessEnvVariable() {
        this.resolveFuncs.set(Constants.ProcessEnvVariableName, async name => {
            const groups = this.processEnvRegex.exec(name);
            if (groups !== null && groups.length === 3) {
                const [, refToggle, environmentVarName] = groups;
                let processEnvName = environmentVarName;
                if (refToggle !== undefined) {
                    processEnvName = await this.resolveSettingsEnvironmentVariable(environmentVarName);
                }
                const envValue = process.env[processEnvName];
                if (envValue !== undefined) {
                    return { value: envValue.toString() };
                } else {
                    return { value: '' };
                }
            }
            return { warning: ResolveWarningMessage.IncorrectProcessEnvVariableFormat };
        });
    }

    private registerDotenvVariable() {
        this.resolveFuncs.set(Constants.DotenvVariableName, async (name, document) => {
            let folderPath = path.dirname(document.fileName);
            while (!await fs.existsSync(path.join(folderPath, '.env'))) {
                folderPath = path.join(folderPath, '..');
                if (folderPath === path.parse(process.cwd()).root) {
                    return { warning: ResolveWarningMessage.DotenvFileNotFound };
                }
            }
            const absolutePath = path.join(folderPath, '.env');
            const groups = this.dotenvRegex.exec(name);
            if (groups !== null && groups.length === 3) {
                const parsed = parseDotenv(fs.readFileSync(absolutePath));
                const [, refToggle, key] = groups;
                let dotEnvVarName = key;
                if (refToggle !== undefined) {
                    dotEnvVarName = await this.resolveSettingsEnvironmentVariable(key);
                }
                if (!(dotEnvVarName in parsed)) {
                    return { warning: ResolveWarningMessage.DotenvVariableNotFound };
                }

                return { value: parsed[dotEnvVarName] };
            }

            return { warning: ResolveWarningMessage.IncorrectDotenvVariableFormat };
        });
    }

    private async resolveSettingsEnvironmentVariable(name: string) {
        if (await this.innerSettingsEnvironmentVariableProvider.has(name)) {
            const { value, error, warning } = await this.innerSettingsEnvironmentVariableProvider.get(name);
            if (!error && !warning) {
                return value!.toString();
            } else {
                return name;
            }
        } else {
            return name;
        }
    }

}
