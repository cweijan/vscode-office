import * as fs from 'fs';
import { RequestHeaders } from '../models/types';
import { RestClientSettings } from '../models/configurationSettings';
import { HttpRequest } from '../models/httpRequest';
import { RequestParser } from '../models/requestParser';
import { base64, hasHeader } from './misc';
import { parseRequestHeaders, resolveRequestBodyPath } from './requestParserUtil';

const DefaultContentType = 'application/x-www-form-urlencoded';

function parseCurlArgs(command: string): Record<string, unknown> {
    const tokens: string[] = [];
    let current = '';
    let quote: string | undefined;
    for (let i = 0; i < command.length; i++) {
        const ch = command[i];
        if (quote) {
            if (ch === quote) quote = undefined;
            else current += ch;
            continue;
        }
        if (ch === '"' || ch === "'") { quote = ch; continue; }
        if (/\s/.test(ch)) {
            if (current) { tokens.push(current); current = ''; }
            continue;
        }
        current += ch;
    }
    if (current) tokens.push(current);

    const result: Record<string, unknown> = { _: [] as string[] };
    if (tokens[0]?.toLowerCase() === 'curl') tokens.shift();

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (token.startsWith('-X') && token.length > 2) {
            result.X = token.slice(2);
            continue;
        }
        if (!token.startsWith('-')) {
            const args = result._ as string[];
            if (!args[1]) args[1] = token;
            else args.push(token);
            continue;
        }
        const next = tokens[i + 1];
        const setFlag = (key: string, value = next) => {
            const existing = result[key];
            if (existing === undefined) result[key] = value;
            else if (Array.isArray(existing)) existing.push(value);
            else result[key] = [existing, value];
            if (value === next) i++;
        };
        switch (token) {
            case '-X':
            case '--request': setFlag('X'); break;
            case '-H':
            case '--header': setFlag('H'); break;
            case '-d':
            case '--data': setFlag('d'); break;
            case '--data-ascii': setFlag('data-ascii'); break;
            case '--data-binary': setFlag('data-binary'); break;
            case '--data-raw': setFlag('data-raw'); break;
            case '-b':
            case '--cookie': setFlag('b'); break;
            case '-u':
            case '--user': setFlag('u'); break;
            case '-L':
            case '--location': result.L = true; break;
            case '--compressed': result.compressed = true; break;
            case '--url': setFlag('url'); break;
            case '-I':
            case '--head': result.X = 'HEAD'; break;
        }
    }
    return result;
}

export class CurlRequestParser implements RequestParser {

    public constructor(private readonly requestRawText: string, private readonly settings: RestClientSettings) {
    }

    public async parseHttpRequest(name?: string): Promise<HttpRequest> {
        let requestText = CurlRequestParser.mergeMultipleSpacesIntoSingle(
            CurlRequestParser.mergeIntoSingleLine(this.requestRawText.trim()));
        requestText = requestText
            .replace(/(-X)(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS|CONNECT|TRACE)/, '$1 $2')
            .replace(/(-I|--head)(?=\s+)/, '-X HEAD');
        const parsedArguments = parseCurlArgs(requestText);

        // parse url
        const args = parsedArguments._ as string[] | undefined;
        let url: string | undefined = args?.[1];
        if (!url) {
            url = (parsedArguments.L || parsedArguments.location || parsedArguments.compressed || parsedArguments.url) as string | undefined;
        }

        // parse header
        let headers: RequestHeaders = {};
        let parsedHeaders = parsedArguments.H || parsedArguments.header;
        if (parsedHeaders) {
            if (!Array.isArray(parsedHeaders)) {
                parsedHeaders = [parsedHeaders];
            }
            headers = parseRequestHeaders(parsedHeaders, this.settings.defaultHeaders, url);
        }

        // parse cookie
        const cookieString: string = parsedArguments.b || parsedArguments.cookie;
        if (cookieString?.includes('=')) {
            // Doesn't support cookie jar
            headers['Cookie'] = cookieString;
        }

        const user = parsedArguments.u || parsedArguments.user;
        if (user) {
            headers['Authorization'] = `Basic ${base64(user)}`;
        }

        // parse body
        let body = parsedArguments.d || parsedArguments.data || parsedArguments['data-ascii'] || parsedArguments['data-binary'] || parsedArguments['data-raw'];
        if (Array.isArray(body)) {
            body = body.join('&');
        }

        if (typeof body === 'string' && body[0] === '@') {
            const fileAbsolutePath = await resolveRequestBodyPath(body.substring(1));
            if (fileAbsolutePath) {
                body = fs.createReadStream(fileAbsolutePath);
            } else {
                body = body.substring(1);
            }
        }

        // Set Content-Type header to application/x-www-form-urlencoded if has body and missing this header
        if (body && !hasHeader(headers, 'content-type')) {
            headers['Content-Type'] = DefaultContentType;
        }

        // parse method
        let method: string = (parsedArguments.X || parsedArguments.request) as string;
        if (!method) {
            method = body ? "POST" : "GET";
        }

        return new HttpRequest(method, url, headers, body, body, name);
    }

    private static mergeIntoSingleLine(text: string): string {
        return text.replace(/\\\r|\\\n/g, '');
    }

    private static mergeMultipleSpacesIntoSingle(text: string): string {
        return text.replace(/\s{2,}/g, ' ');
    }
}