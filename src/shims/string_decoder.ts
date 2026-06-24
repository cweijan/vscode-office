export class StringDecoder {
    constructor(_encoding?: string) { }
    write(buffer: Uint8Array | string) {
        return typeof buffer === 'string' ? buffer : new TextDecoder().decode(buffer);
    }
    end() {
        return '';
    }
}

export default { StringDecoder };
