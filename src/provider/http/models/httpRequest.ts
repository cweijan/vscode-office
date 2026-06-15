import { Stream } from 'stream';
import { getContentType } from '../utils/misc';
import { RequestHeaders } from './types';

export class HttpRequest {
    public isCancelled = false;
    private readonly abortController = new AbortController();

    public constructor(
        public method: string,
        public url: string,
        public headers: RequestHeaders,
        public body?: string | Stream,
        public rawBody?: string,
        public name?: string) {
        this.method = method.toLocaleUpperCase();
    }

    public get signal(): AbortSignal {
        return this.abortController.signal;
    }

    public get contentType(): string | undefined {
        return getContentType(this.headers);
    }

    public cancel(): void {
        if (this.isCancelled) {
            return;
        }
        this.isCancelled = true;
        this.abortController.abort();
    }
}
