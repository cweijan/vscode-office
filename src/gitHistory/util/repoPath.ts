import * as path from 'path';

export function normalizeRepoPath(p: string): string {
    const normalized = path.normalize(p);
    return process.platform === 'win32' ? normalized.replace(/\\/g, '/') : normalized;
}

/**
 * Returns a stable identity key for a repository path. Windows paths are
 * case-insensitive, and callers may provide either slash direction. Keep
 * normalizeRepoPath's original casing for display and filesystem operations,
 * but use this key when comparing repository identities.
 */
export function repoPathKey(p: string): string {
    let normalized = normalizeRepoPath(p);
    // path.normalize preserves a trailing separator, so c:/repo/ and c:/repo
    // would otherwise still produce different repository identities.
    if (normalized.length > 1 && normalized !== '/' && !/^[A-Za-z]:\/$/.test(normalized)) {
        normalized = normalized.replace(/\/+$/, '');
    }
    return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}

export function getRelativeRepoPath(repo: string, filePath: string): string | null {
    const repoNorm = normalizeRepoPath(repo);
    const fileNorm = normalizeRepoPath(filePath);
    if (fileNorm === repoNorm) {
        return null;
    }
    const prefix = repoNorm.endsWith('/') ? repoNorm : `${repoNorm}/`;
    if (!fileNorm.startsWith(prefix)) {
        return null;
    }
    return fileNorm.slice(prefix.length);
}

export function fileTouchesPath(
    relPath: string,
    oldFilePath: string,
    newFilePath: string
): boolean {
    return oldFilePath === relPath || newFilePath === relPath;
}
