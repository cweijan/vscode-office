const LOG_PREFIX = '[markdown-export]';

export function logExportError(scope: string, error?: unknown): void {
    console.error(`${LOG_PREFIX} ERROR: ${scope}`);
    console.log(`${LOG_PREFIX} ERROR: ${scope}`);
    if (error) {
        const message = error instanceof Error ? error.toString() : String(error);
        console.error(message);
        console.log(message);
    }
}

export function logExportInfo(message: string): void {
    console.log(`${LOG_PREFIX} ${message}`);
}
