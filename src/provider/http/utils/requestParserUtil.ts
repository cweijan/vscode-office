import * as fs from 'fs';
import * as path from 'path';
import { Uri } from 'vscode';
import { RequestHeaders } from '../models/types';
import { removeHeader } from './misc';
import { getCurrentTextDocument, getWorkspaceRootPath } from './workspaceUtility';

export function parseRequestHeaders(headerLines: string[], defaultHeaders: RequestHeaders, url: string): RequestHeaders {
    // message-header = field-name ":" [ field-value ]
    const headers: RequestHeaders = {};
    const headerNames: { [key: string]: string } = {};
    headerLines.forEach(headerLine => {
        let fieldName: string;
        let fieldValue: string;
        const separatorIndex = headerLine.indexOf(':');
        if (separatorIndex === -1) {
            fieldName = headerLine.trim();
            fieldValue = '';
        } else {
            fieldName = headerLine.substring(0, separatorIndex).trim();
            fieldValue = headerLine.substring(separatorIndex + 1).trim();
        }

        const normalizedFieldName = fieldName.toLowerCase();
        if (!headerNames[normalizedFieldName]) {
            headerNames[normalizedFieldName] = fieldName;
            headers[fieldName] = fieldValue;
        } else {
            const splitter = normalizedFieldName === 'cookie' ? ';' : ',';
            headers[headerNames[normalizedFieldName]] += `${splitter}${fieldValue}`;
        }
    });

    if (url[0] !== '/') {
        removeHeader(defaultHeaders, 'host');
    }

    return { ...defaultHeaders, ...headers };
}

export async function resolveRequestBodyPath(refPath: string): Promise<string | undefined> {
    if (path.isAbsolute(refPath)) {
        return (fs.existsSync(refPath)) ? refPath : undefined;
    }

    const workspaceRoot = getWorkspaceRootPath();
    if (workspaceRoot) {
        const absolutePath = path.join(Uri.parse(workspaceRoot).fsPath, refPath);
        if (fs.existsSync(absolutePath)) {
            return absolutePath;
        }
    }

    const currentFile = getCurrentTextDocument()?.fileName;
    if (currentFile) {
        const absolutePath = path.join(path.dirname(currentFile), refPath);
        if (fs.existsSync(absolutePath)) {
            return absolutePath;
        }
    }

    return undefined;
}