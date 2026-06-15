import { CurlRequestParser } from '../utils/curlRequestParser';
import { HttpRequestParser } from '../utils/httpRequestParser';
import { RestClientSettings } from './configurationSettings';
import { HttpRequest } from './httpRequest';

export interface RequestParser {
    parseHttpRequest(name?: string, withHeader?: boolean): Promise<HttpRequest>;
}

const curlRegex = /^\s*curl/i;

export function createRequestParser(rawHttpRequest: string): RequestParser {
    const settings = RestClientSettings.Instance;
    if (curlRegex.test(rawHttpRequest)) {
        return new CurlRequestParser(rawHttpRequest, settings);
    }
    return new HttpRequestParser(rawHttpRequest, settings);
}
