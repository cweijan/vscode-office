import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

interface LanguagePack {
    [key: string]: string;
}

interface LocalizeOptions {
    locale?: string;
}

class Localize {
    private readonly options: LocalizeOptions;
    private extensionPath = '';
    private bundle: LanguagePack = {};

    constructor(options: LocalizeOptions = {}) {
        this.options = options;
    }

    localize(key: string, ...args: string[]): string {
        const message = this.bundle[key] || key;
        return this.format(message, args);
    }

    init(extensionPath: string): void {
        this.extensionPath = extensionPath;
        this.bundle = this.resolveLanguagePack();
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

    private resolveLanguagePack(): LanguagePack {
        const defaultResolvedLanguage = '.nls.json';
        let resolvedLanguage = '';
        const rootPath = this.extensionPath || process.cwd();
        const file = path.join(rootPath, 'package');

        if (!this.options.locale) {
            resolvedLanguage = defaultResolvedLanguage;
        } else {
            let locale = this.options.locale;
            while (locale) {
                const candidate = '.nls.' + locale + '.json';
                if (fs.existsSync(file + candidate)) {
                    resolvedLanguage = candidate;
                    break;
                }
                const index = locale.lastIndexOf('-');
                if (index > 0) {
                    locale = locale.substring(0, index);
                } else {
                    resolvedLanguage = defaultResolvedLanguage;
                    locale = '';
                }
            }
        }

        let defaultLanguageBundle: LanguagePack = {};
        if (resolvedLanguage !== defaultResolvedLanguage) {
            defaultLanguageBundle = JSON.parse(fs.readFileSync(file + defaultResolvedLanguage, 'utf8'));
        }

        const languageFilePath = path.join(file + resolvedLanguage);
        const resolvedLanguageBundle: LanguagePack = fs.existsSync(languageFilePath)
            ? JSON.parse(fs.readFileSync(languageFilePath, 'utf8'))
            : {};

        return {
            ...defaultLanguageBundle,
            ...resolvedLanguageBundle,
        };
    }
}

const instance = new Localize({ locale: vscode.env.language });

export function initI18n(extensionPath: string): void {
    instance.init(extensionPath);
}

export function localize(key: string, ...args: string[]): string {
    return instance.localize(key, ...args);
}
