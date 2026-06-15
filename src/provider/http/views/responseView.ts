import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { EOL } from 'os';
import { IncomingHttpHeaders, OutgoingHttpHeaders } from 'http';
import { CancellationToken, commands, env, Event, EventEmitter, languages, ProviderResult, TextDocumentContentProvider, Uri, ViewColumn, window, workspace } from 'vscode';
import { RestClientSettings } from '../models/configurationSettings';
import { HttpResponse } from '../models/httpResponse';
import { PreviewOption } from '../models/types';
import { MimeUtility } from '../utils/mimeUtility';
import { ResponseFormatUtility } from '../utils/responseFormatUtility';

class ResponseContentProvider implements TextDocumentContentProvider {
    private readonly settings = RestClientSettings.Instance;
    private readonly onDidChangeEmitter = new EventEmitter<Uri>();
    private readonly responses = new Map<string, HttpResponse>();

    public get onDidChange(): Event<Uri> {
        return this.onDidChangeEmitter.event;
    }

    public provideTextDocumentContent(uri: Uri, _token: CancellationToken): ProviderResult<string> {
        const response = this.responses.get(uri.toString());
        return response ? this.formatResponse(response) : '';
    }

    public update(uri: Uri, response: HttpResponse): void {
        this.responses.set(uri.toString(), response);
        this.onDidChangeEmitter.fire(uri);
    }

    private formatResponse(response: HttpResponse): string {
        let content = '';
        const previewOption = this.settings.previewOption;
        if (previewOption === PreviewOption.Exchange) {
            const request = response.request;
            content += `${request.method} ${request.url} HTTP/1.1${EOL}`;
            content += this.formatHeaders(request.headers as OutgoingHttpHeaders);
            if (request.body) {
                const body = typeof request.body === 'string' ? request.body : 'NOTE: Request Body From Is File Not Shown';
                content += `${EOL}${ResponseFormatUtility.formatBody(body, request.contentType, true)}${EOL}`;
            }
            content += EOL.repeat(2);
        }

        if (previewOption !== PreviewOption.Body) {
            content += `HTTP/${response.httpVersion} ${response.statusCode} ${response.statusMessage}${EOL}`;
            content += this.formatHeaders(response.headers as IncomingHttpHeaders);
        }

        if (previewOption !== PreviewOption.Headers) {
            const prefix = previewOption === PreviewOption.Body ? '' : EOL;
            content += `${prefix}${ResponseFormatUtility.formatBody(response.body, response.contentType, true)}`;
        }

        return content;
    }

    private formatHeaders(headers: OutgoingHttpHeaders | IncomingHttpHeaders): string {
        let headerString = '';
        for (const header in headers) {
            const value = headers[header];
            if (value) {
                headerString += `${header}: ${Array.isArray(value) ? value.join(', ') : value}${EOL}`;
            }
        }
        return headerString;
    }
}

export class HttpResponseView {
    private readonly settings = RestClientSettings.Instance;
    private readonly contentProvider = new ResponseContentProvider();
    private readonly scheme = 'rest-client-response';
    private readonly responseUri = Uri.parse(`${this.scheme}://response/Response`);
    private currentResponse?: HttpResponse;

    public constructor() {
        workspace.registerTextDocumentContentProvider(this.scheme, this.contentProvider);
        commands.registerCommand('vscode-office.copy-response-body', () => this.copyBody());
        commands.registerCommand('vscode-office.save-response-body', () => this.saveBody());
    }

    public async render(response: HttpResponse, column?: ViewColumn) {
        this.currentResponse = response;
        this.contentProvider.update(this.responseUri, response);
        const document = await workspace.openTextDocument(this.responseUri);
        languages.setTextDocumentLanguage(document, this.getLanguageId(response));
        await window.showTextDocument(document, { viewColumn: column, preserveFocus: true, preview: false });
    }

    private getLanguageId(response: HttpResponse): string {
        if (this.settings.previewOption !== PreviewOption.Body) {
            return 'http';
        }
        const contentType = response.contentType;
        if (MimeUtility.isJSON(contentType)) return 'json';
        if (MimeUtility.isJavaScript(contentType)) return 'javascript';
        if (MimeUtility.isXml(contentType)) return 'xml';
        if (MimeUtility.isHtml(contentType)) return 'html';
        if (MimeUtility.isCSS(contentType)) return 'css';
        return 'http';
    }

    private async copyBody() {
        if (!this.currentResponse) return;
        const formattedBody = ResponseFormatUtility.formatBody(this.currentResponse.body, this.currentResponse.contentType, true);
        await env.clipboard.writeText(formattedBody);
        window.showInformationMessage('Copied to clipboard');
    }

    private async saveBody() {
        if (!this.currentResponse) return;
        let extension = MimeUtility.getExtension(this.currentResponse.contentType);
        if (!extension) {
            const match = this.currentResponse.request.url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
            extension = match?.[1];
        }
        const fileName = extension ? `Response-${Date.now()}.${extension}` : `Response-${Date.now()}`;
        const defaultFilePath = path.join(os.homedir(), 'Downloads', fileName);
        const uri = await window.showSaveDialog({ defaultUri: Uri.file(defaultFilePath) });
        if (!uri) return;

        const filePath = uri.fsPath;
        fs.writeFileSync(filePath, this.currentResponse.bodyBuffer, { flag: 'w' });
        const btn = await window.showInformationMessage(`Saved to ${filePath}`, { title: 'Open' }, { title: 'Copy Path' });
        if (btn?.title === 'Open') {
            workspace.openTextDocument(filePath).then(window.showTextDocument);
        } else if (btn?.title === 'Copy Path') {
            await env.clipboard.writeText(filePath);
        }
    }
}
