import { ExtensionContext, env, workspace } from 'vscode';
import { extensionResource, readExtensionText } from '../extensionResource';

interface LanguagePack {
    [key: string]: string;
}

interface LocalizeOptions {
    locale?: string;
}

const DEFAULT_NLS_FILE = 'package.nls.json';

class Localize {
    private readonly options: LocalizeOptions;
    private bundle: LanguagePack = {};

    constructor(options: LocalizeOptions = {}) {
        this.options = options;
    }

    localize(key: string, ...args: string[]): string {
        const message = this.bundle[key] || key;
        return this.format(message, args);
    }

    async init(context: ExtensionContext): Promise<void> {
        this.bundle = await this.resolveLanguagePack(context);
    }

    private format(message: string, args: string[] = []): string {
        if (args.length === 0) {
            return message;
        }
        return message.replace(/\$(\d+)/g, (match, rest) => {
            const index = parseInt(rest[0], 10) - 1;
            return args[index] ?? match;
        });
    }

    private async nlsFileExists(context: ExtensionContext, fileName: string): Promise<boolean> {
        try {
            await workspace.fs.stat(extensionResource(context, fileName));
            return true;
        } catch {
            return false;
        }
    }

    private async readLanguagePack(context: ExtensionContext, fileName: string): Promise<LanguagePack> {
        try {
            const text = await readExtensionText(context, fileName);
            return JSON.parse(text);
        } catch {
            return {};
        }
    }

    private async resolveLanguagePack(context: ExtensionContext): Promise<LanguagePack> {
        let resolvedFile = DEFAULT_NLS_FILE;

        if (this.options.locale) {
            let locale = this.options.locale;
            while (locale) {
                const candidate = `package.nls.${locale}.json`;
                if (await this.nlsFileExists(context, candidate)) {
                    resolvedFile = candidate;
                    break;
                }
                const index = locale.lastIndexOf('-');
                if (index > 0) {
                    locale = locale.substring(0, index);
                } else {
                    resolvedFile = DEFAULT_NLS_FILE;
                    break;
                }
            }
        }

        let defaultLanguageBundle: LanguagePack = {};
        if (resolvedFile !== DEFAULT_NLS_FILE) {
            defaultLanguageBundle = await this.readLanguagePack(context, DEFAULT_NLS_FILE);
        }

        const resolvedLanguageBundle = await this.readLanguagePack(context, resolvedFile);

        return {
            ...defaultLanguageBundle,
            ...resolvedLanguageBundle,
        };
    }
}

const instance = new Localize({ locale: env.language });

export async function initI18n(context: ExtensionContext): Promise<void> {
    await instance.init(context);
}

export function localize(key: string, ...args: string[]): string {
    return instance.localize(key, ...args);
}
