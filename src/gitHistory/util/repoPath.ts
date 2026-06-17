import * as path from 'path';

export function normalizeRepoPath(p: string): string {
    return path.normalize(p).replace(/\\/g, '/');
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
