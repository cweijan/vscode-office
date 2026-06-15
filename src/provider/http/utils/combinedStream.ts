import { PassThrough, Readable } from 'stream';

type StreamChunk = string | Buffer | Readable;

export class CombinedStream extends PassThrough {
    private pending = Promise.resolve();

    public static create(): CombinedStream {
        return new CombinedStream();
    }

    public append(chunk: StreamChunk): void {
        if (typeof chunk === 'string' || Buffer.isBuffer(chunk)) {
            this.write(chunk);
            return;
        }

        this.pending = this.pending.then(() => new Promise<void>(resolve => {
            chunk.on('data', data => this.write(data));
            chunk.on('end', () => resolve());
            chunk.on('error', error => this.destroy(error));
        }));
    }

    public async finalize(): Promise<void> {
        await this.pending;
        this.end();
    }
}
