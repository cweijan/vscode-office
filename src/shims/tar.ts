export class Parser {
    on(_event: string, _listener: (...args: unknown[]) => void) {
        return this;
    }
    write(_chunk: unknown) { }
    end() { }
}

export class ReadEntry { }

export default { Parser, ReadEntry };
