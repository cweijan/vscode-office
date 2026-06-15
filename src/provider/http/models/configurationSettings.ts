import { CharacterPair, Event, EventEmitter, languages, ViewColumn, window, workspace } from 'vscode';
import { getCurrentTextDocument } from '../utils/workspaceUtility';
import {
    FormParamEncodingStrategy,
    LogLevel,
    parseFormParamEncoding,
    parseLogLevel,
    parsePreviewOption,
    PreviewOption,
    RequestHeaders,
} from './types';

interface IRestClientSettings {
    followRedirect: boolean;
    defaultHeaders: RequestHeaders;
    environmentVariables: { [key: string]: { [key: string]: string } };
    previewOption: PreviewOption;
    previewColumn: ViewColumn;
    formParamEncodingStrategy: FormParamEncodingStrategy;
    addRequestBodyLineIndentationAroundBrackets: boolean;
    decodeEscapedUnicodeCharacters: boolean;
    logLevel: LogLevel;
    enableCustomVariableReferencesCodeLens: boolean;
}

export class RestClientSettings implements IRestClientSettings {
    public followRedirect: boolean;
    public defaultHeaders: RequestHeaders;
    public environmentVariables: { [key: string]: { [key: string]: string } };
    public previewOption: PreviewOption;
    public previewColumn: ViewColumn;
    public formParamEncodingStrategy: FormParamEncodingStrategy;
    public addRequestBodyLineIndentationAroundBrackets: boolean;
    public decodeEscapedUnicodeCharacters: boolean;
    public logLevel: LogLevel;
    public enableCustomVariableReferencesCodeLens: boolean;

    private readonly brackets: CharacterPair[] = [['{', '}'], ['[', ']'], ['<', '>']];
    private static _instance: RestClientSettings;

    public static get Instance(): RestClientSettings {
        if (!this._instance) {
            this._instance = new RestClientSettings();
        }
        return this._instance;
    }

    private readonly configurationUpdateEventEmitter = new EventEmitter<void>();

    public get onDidChangeConfiguration(): Event<void> {
        return this.configurationUpdateEventEmitter.event;
    }

    private constructor() {
        workspace.onDidChangeConfiguration(() => {
            this.initializeSettings();
            this.configurationUpdateEventEmitter.fire();
        });
        window.onDidChangeActiveTextEditor(e => {
            if (e) {
                this.initializeSettings();
                this.configurationUpdateEventEmitter.fire();
            }
        });
        this.initializeSettings();
    }

    private initializeSettings() {
        const document = getCurrentTextDocument();
        const config = workspace.getConfiguration('vscode-office', document?.uri);
        this.followRedirect = config.get<boolean>('followredirect', true);
        this.defaultHeaders = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36 Edg/92.0.902.62'
        };
        this.environmentVariables = config.get<{ [key: string]: { [key: string]: string } }>('environmentVariables', {});
        this.previewColumn = this.parseColumn(config.get<string>('previewColumn', 'beside'));
        this.previewOption = parsePreviewOption(config.get<string>('previewOption', 'full'));
        this.formParamEncodingStrategy = parseFormParamEncoding(config.get<string>('formParamEncodingStrategy', 'automatic'));
        this.addRequestBodyLineIndentationAroundBrackets = config.get<boolean>('addRequestBodyLineIndentationAroundBrackets', true);
        this.decodeEscapedUnicodeCharacters = config.get<boolean>('decodeEscapedUnicodeCharacters', false);
        this.logLevel = parseLogLevel(config.get<string>('logLevel', 'error'));
        this.enableCustomVariableReferencesCodeLens = config.get<boolean>('enableCustomVariableReferencesCodeLens', true);
        languages.setLanguageConfiguration('http', { brackets: this.addRequestBodyLineIndentationAroundBrackets ? this.brackets : [] });
    }

    private parseColumn(value: string): ViewColumn {
        return value.toLowerCase() === 'current' ? ViewColumn.Active : ViewColumn.Beside;
    }
}
