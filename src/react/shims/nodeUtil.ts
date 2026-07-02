type InspectOptions = {
    depth?: number | null;
};

function safeStringify(value: unknown, depth: number | null = 2): string {
    const seen = new WeakSet<object>();
    const maxDepth = depth == null ? Number.POSITIVE_INFINITY : depth;

    const visit = (input: unknown, currentDepth: number): unknown => {
        if (input == null || typeof input !== 'object') {
            return input;
        }
        if (seen.has(input as object)) {
            return '[Circular]';
        }
        if (currentDepth >= maxDepth) {
            return Array.isArray(input) ? '[Array]' : '[Object]';
        }
        seen.add(input as object);
        if (Array.isArray(input)) {
            return input.map((item) => visit(item, currentDepth + 1));
        }
        const output: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(input)) {
            output[key] = visit(value, currentDepth + 1);
        }
        return output;
    };

    try {
        return JSON.stringify(visit(value, 0), null, 2);
    } catch {
        return String(value);
    }
}

export function inspect(value: unknown, _showHidden?: boolean, depth?: number | null, _colors?: boolean): string {
    return safeStringify(value, depth ?? 2);
}

export function debuglog(_section: string) {
    return (..._args: unknown[]) => undefined;
}

export function format(formatter: unknown, ...args: unknown[]): string {
    if (typeof formatter !== 'string') {
        return [formatter, ...args].map((item) => inspect(item)).join(' ');
    }

    let index = 0;
    return formatter.replace(/%[sdjo%]/g, (token) => {
        if (token === '%%') {
            return '%';
        }
        const value = args[index++];
        switch (token) {
            case '%s':
                return String(value);
            case '%d':
                return String(Number(value));
            case '%j':
            case '%o':
                return inspect(value);
            default:
                return token;
        }
    });
}

export default {
    debuglog,
    format,
    inspect,
};
