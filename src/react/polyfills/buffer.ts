import { Buffer } from 'buffer';

if (!globalThis.Buffer) {
    globalThis.Buffer = Buffer;
}
