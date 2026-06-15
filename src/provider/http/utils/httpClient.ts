import { Agent } from 'https';
import { RestClientSettings } from '../models/configurationSettings';
import { HttpRequest } from '../models/httpRequest';
import { HttpResponse } from '../models/httpResponse';
import { RequestHeaders, ResponseHeaders } from '../models/types';
import { MimeUtility } from './mimeUtility';
import { encodeUrl, getHeader, removeHeader } from './misc';
import { convertBufferToStream, convertStreamToBuffer } from './streamUtility';

export interface RequestProgress {
    phase: 'sending' | 'receiving';
    loaded?: number;
    total?: number;
}

interface RequestOption {
    method: string;
    headers: RequestHeaders;
    body?: string | Buffer;
    auth?: string;
}

export class HttpClient {
    private readonly _settings = RestClientSettings.Instance;
    private readonly _httpsAgent = new Agent({ rejectUnauthorized: false });

    public async send(
        httpRequest: HttpRequest,
        onProgress?: (progress: RequestProgress) => void,
    ): Promise<HttpResponse> {
        const options = await this.prepareOptions(httpRequest);
        const { method, headers, body } = options;

        const bodySize = 0;
        const headersSize = 0;
        const requestUrl = encodeUrl(httpRequest.url);
        const startDate = Date.now();

        onProgress?.({ phase: 'sending' });

        const response = await fetch(requestUrl, {
            method,
            headers: headers as Record<string, string>,
            body: body as BodyInit | undefined,
            redirect: this._settings.followRedirect ? 'follow' : 'manual',
            signal: httpRequest.signal,
            // @ts-expect-error Node fetch supports https agent
            agent: requestUrl.startsWith('https') ? this._httpsAgent : undefined,
        });

        if (httpRequest.isCancelled) {
            throw this.createCancelledError();
        }

        const contentType = response.headers.get('content-type') ?? undefined;
        const charset = contentType ? MimeUtility.parse(contentType).charset : undefined;
        const bodyBuffer = await this.readResponseBody(response, httpRequest, onProgress);
        let bodyString = MimeUtility.decodeBuffer(bodyBuffer, charset);

        if (this._settings.decodeEscapedUnicodeCharacters) {
            bodyString = this.decodeEscapedUnicodeCharacters(bodyString);
        }

        const responseHeaders: ResponseHeaders = {};
        for (const [key, value] of response.headers.entries()) {
            responseHeaders[key] = value;
        }

        const requestBody = body;
        const statusMessage = (response as Response & { statusText?: string }).statusText ?? '';

        return new HttpResponse(
            response.status,
            statusMessage,
            '1.1',
            responseHeaders,
            bodyString,
            bodySize,
            headersSize,
            bodyBuffer,
            {
                total: Date.now() - startDate
            } as any,
            new HttpRequest(
                method,
                requestUrl,
                HttpClient.normalizeHeaderNames(
                    httpRequest.headers,
                    Object.keys(httpRequest.headers)),
                Buffer.isBuffer(requestBody) ? convertBufferToStream(requestBody) : requestBody,
                httpRequest.rawBody,
                httpRequest.name
            ));
    }

    private async readResponseBody(
        response: Response,
        httpRequest: HttpRequest,
        onProgress?: (progress: RequestProgress) => void,
    ): Promise<Buffer> {
        if (!response.body) {
            return Buffer.alloc(0);
        }

        const contentLength = response.headers.get('content-length');
        const total = contentLength ? Number.parseInt(contentLength, 10) : undefined;
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let loaded = 0;

        onProgress?.({ phase: 'receiving', loaded, total });

        while (true) {
            if (httpRequest.isCancelled) {
                await reader.cancel();
                throw this.createCancelledError();
            }

            const { done, value } = await reader.read();
            if (done) {
                break;
            }

            chunks.push(value);
            loaded += value.byteLength;
            onProgress?.({ phase: 'receiving', loaded, total });
        }

        return Buffer.concat(chunks);
    }

    private createCancelledError(): Error {
        const error = new Error('Request cancelled');
        error.name = 'AbortError';
        return error;
    }

    private async prepareOptions(httpRequest: HttpRequest): Promise<RequestOption> {
        const originalRequestBody = httpRequest.body;
        let requestBody: string | Buffer | undefined;
        if (originalRequestBody) {
            if (typeof originalRequestBody !== 'string') {
                requestBody = await convertStreamToBuffer(originalRequestBody);
            } else {
                requestBody = originalRequestBody;
            }
        }

        const clonedHeaders = Object.assign({}, httpRequest.headers);
        const options: RequestOption = {
            headers: clonedHeaders,
            method: httpRequest.method,
            body: requestBody,
        };

        const authorization = getHeader(options.headers, 'Authorization') as string | undefined;
        if (authorization) {
            const [scheme, user, ...args] = authorization.split(/\s+/);
            const normalizedScheme = scheme.toLowerCase();
            if (args.length > 0) {
                const pass = args.join(' ');
                if (normalizedScheme === 'basic') {
                    removeHeader(options.headers, 'Authorization');
                    options.auth = `${user}:${pass}`;
                }
            } else if (normalizedScheme === 'basic' && user.includes(':')) {
                removeHeader(options.headers, 'Authorization');
                options.auth = user;
            }
        }

        if (options.auth) {
            options.headers.Authorization = `Basic ${Buffer.from(options.auth).toString('base64')}`;
        }

        return options;
    }

    private decodeEscapedUnicodeCharacters(body: string): string {
        return body.replace(/\\u([0-9a-fA-F]{4})/gi, (_, g) => {
            const char = String.fromCharCode(parseInt(g, 16));
            return char === '"' ? '\\"' : char;
        });
    }

    private static normalizeHeaderNames<T extends RequestHeaders | ResponseHeaders>(headers: T, rawHeaders: string[]): T {
        const headersDic: { [key: string]: string } = rawHeaders.reduce(
            (prev, cur) => {
                if (!(cur.toLowerCase() in prev)) {
                    prev[cur.toLowerCase()] = cur;
                }
                return prev;
            }, {} as { [key: string]: string });
        const adjustedResponseHeaders = {} as RequestHeaders | ResponseHeaders;
        for (const header in headers) {
            const adjustedHeaderName = headersDic[header] || header;
            adjustedResponseHeaders[adjustedHeaderName] = headers[header];
        }

        return adjustedResponseHeaders as T;
    }
}
