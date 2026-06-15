export function isZipPasswordError(err: unknown): boolean {
    const message = (err as Error)?.message ?? String(err);
    return /wrong password|invalid password|ERR_INVALID_PASSWORD|incompatible password|bad password|unsupported encryption/i.test(message);
}
