import { ExtensionContext, ProgressLocation, Range, TextDocument, ViewColumn, window } from 'vscode';
import Logger from '../logger';
import { RestClientSettings } from '../models/configurationSettings';
import { HttpRequest } from '../models/httpRequest';
import { createRequestParser } from '../models/requestParser';
import { HttpClient, RequestProgress } from '../utils/httpClient';
import { RequestVariableCache } from '../utils/requestVariableCache';
import { Selector } from '../utils/selector';
import { getCurrentTextDocument } from '../utils/workspaceUtility';
import { HttpResponseView } from '../views/responseView';

export class RequestController {
    private readonly settings = RestClientSettings.Instance;
    private readonly httpClient = new HttpClient();
    private readonly responseView = new HttpResponseView();

    public constructor(_context: ExtensionContext) {
    }

    public async run(range: Range) {
        const editor = window.activeTextEditor;
        const document = getCurrentTextDocument();
        if (!editor || !document) {
            return;
        }

        const selectedRequest = await Selector.getRequest(editor, range);
        if (!selectedRequest) {
            return;
        }

        const { text, name, warnBeforeSend } = selectedRequest;
        if (warnBeforeSend) {
            const note = name ? `Are you sure you want to send the request "${name}"?` : 'Are you sure you want to send this request?';
            const userConfirmed = await window.showWarningMessage(note, 'Yes', 'No');
            if (userConfirmed !== 'Yes') {
                return;
            }
        }

        await this.runCore(await createRequestParser(text).parseHttpRequest(name), document);
    }

    private async runCore(httpRequest: HttpRequest, document?: TextDocument) {
        const title = httpRequest.name
            ? `Sending request "${httpRequest.name}"`
            : `Sending ${httpRequest.method} ${httpRequest.url}`;

        try {
            const response = await window.withProgress({
                location: ProgressLocation.Notification,
                title,
                cancellable: true,
            }, async (progress, token) => {
                token.onCancellationRequested(() => httpRequest.cancel());

                return this.httpClient.send(httpRequest, (requestProgress) => {
                    progress.report({ message: this.formatProgressMessage(httpRequest, requestProgress) });
                });
            });

            if (httpRequest.isCancelled) {
                return;
            }

            if (httpRequest.name && document) {
                RequestVariableCache.add(document, httpRequest.name, response);
            }

            try {
                const activeColumn = window.activeTextEditor!.viewColumn;
                const previewColumn = this.settings.previewColumn === ViewColumn.Active
                    ? activeColumn
                    : ((activeColumn as number) + 1) as ViewColumn;
                this.responseView.render(response, previewColumn);
            } catch (reason) {
                Logger.error('Unable to preview response:', reason);
                window.showErrorMessage(String(reason));
            }
        } catch (error: any) {
            if (httpRequest.isCancelled || error?.name === 'AbortError') {
                return;
            }
            if (error.code === 'ETIMEDOUT') {
                error.message = `Request timed out. Double-check your network connection. Details: ${error}.`;
            } else if (error.code === 'ECONNREFUSED') {
                error.message = `The connection was rejected. Either the requested service isn't running on the requested server/port, the proxy settings in vscode are misconfigured, or a firewall is blocking requests. Details: ${error}.`;
            } else if (error.code === 'ENETUNREACH') {
                error.message = `You don't seem to be connected to a network. Details: ${error}`;
            }
            Logger.error('Failed to send request:', error);
            window.showErrorMessage(error.message);
        }
    }

    private formatProgressMessage(httpRequest: HttpRequest, requestProgress: RequestProgress): string {
        if (requestProgress.phase === 'sending') {
            return `${httpRequest.method} ${httpRequest.url}`;
        }

        const loaded = this.formatBytes(requestProgress.loaded ?? 0);
        if (requestProgress.total && requestProgress.total > 0) {
            const percent = Math.min(100, Math.round((requestProgress.loaded ?? 0) * 100 / requestProgress.total));
            return `Receiving response ${loaded} / ${this.formatBytes(requestProgress.total)} (${percent}%)`;
        }

        return `Receiving response ${loaded}`;
    }

    private formatBytes(bytes: number): string {
        if (bytes < 1024) {
            return `${bytes} B`;
        }
        if (bytes < 1024 * 1024) {
            return `${(bytes / 1024).toFixed(1)} KB`;
        }
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    public dispose() {
    }
}
