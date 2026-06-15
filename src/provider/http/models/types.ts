import * as http from 'http';

export type ResponseHeaders = http.IncomingHttpHeaders;
export type ResponseHeaderValue = { [K in keyof ResponseHeaders]: ResponseHeaders[K] }[keyof ResponseHeaders];
export type RequestHeaders = http.OutgoingHttpHeaders;
export type RequestHeaderValue = { [K in keyof RequestHeaders]: RequestHeaders[K] }[keyof RequestHeaders];

export enum LogLevel {
    Verbose,
    Info,
    Warn,
    Error,
}

export enum PreviewOption {
    Full,
    Headers,
    Body,
    Exchange
}

export enum FormParamEncodingStrategy {
    Automatic,
    Never,
    Always,
}

export enum VariableType {
    Environment,
    File,
    Request,
    System,
}

export function parseLogLevel(value: string): LogLevel {
    switch (value.toLowerCase()) {
        case 'verbose': return LogLevel.Verbose;
        case 'info': return LogLevel.Info;
        case 'warn': return LogLevel.Warn;
        default: return LogLevel.Error;
    }
}

export function parsePreviewOption(value: string): PreviewOption {
    switch (value.toLowerCase()) {
        case 'headers': return PreviewOption.Headers;
        case 'body': return PreviewOption.Body;
        case 'exchange': return PreviewOption.Exchange;
        default: return PreviewOption.Full;
    }
}

export function parseFormParamEncoding(value: string): FormParamEncodingStrategy {
    switch (value.toLowerCase()) {
        case 'never': return FormParamEncodingStrategy.Never;
        case 'always': return FormParamEncodingStrategy.Always;
        default: return FormParamEncodingStrategy.Automatic;
    }
}
