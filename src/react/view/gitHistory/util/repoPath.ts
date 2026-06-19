export function normalizeRepoPath(p: string): string {
    return p.replace(/\\/g, '/');
}

export function repoDisplayName(repoPath: string): string {
    const parts = normalizeRepoPath(repoPath).split('/');
    return parts[parts.length - 1] || repoPath;
}

export function getRelativeRepoPath(repo: string, filePath: string): string | undefined {
    const repoNorm = normalizeRepoPath(repo);
    const fileNorm = normalizeRepoPath(filePath);
    if (fileNorm === repoNorm) {
        return undefined;
    }
    const prefix = repoNorm.endsWith('/') ? repoNorm : `${repoNorm}/`;
    if (!fileNorm.startsWith(prefix)) {
        return undefined;
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
