import { getContentType } from '../utils/misc';
import { ResponseHeaders } from './types';
import { HttpRequest } from "./httpRequest";

export class HttpResponse {
    public constructor(
        public statusCode: number,
        public statusMessage: string,
        public httpVersion: string,
        public headers: ResponseHeaders,
        public body: string,
        public bodySizeInBytes: number,
        public headersSizeInBytes: number,
        public bodyBuffer: Buffer,
        public timingPhases: GotTimingsPhases,
        public request: HttpRequest) {
    }

    public get contentType(): string | undefined {
        return getContentType(this.headers);
    }
}

interface GotTimingsPhases {
    wait: number;
    dns: number;
    tcp: number;
    request: number;
    firstByte: number;
    download: number;
    total: number;
}