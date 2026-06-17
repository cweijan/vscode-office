import type { GitCommit } from '../types';

export interface FindCommitMatchesResult {
    indices: number[];
    error: string | null;
}

export function findCommitMatches(
    commits: GitCommit[],
    text: string,
    caseSensitive: boolean,
    useRegex = false,
): FindCommitMatchesResult {
    const query = text.trim();
    if (!query) {
        return { indices: [], error: null };
    }

    const flags = caseSensitive ? 'u' : 'ui';
    let pattern: RegExp;
    try {
        const source = useRegex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        pattern = new RegExp(source, flags);
    } catch (e) {
        const message = e instanceof Error ? e.message : 'Invalid regular expression';
        return { indices: [], error: message };
    }

    const indices: number[] = [];
    for (let i = 0; i < commits.length; i++) {
        const commit = commits[i];
        if (commit.hash !== '*' && (
            pattern.test(commit.message)
            || pattern.test(commit.author)
            || pattern.test(commit.hash)
            || pattern.test(commit.hash.substring(0, 7))
        )) {
            indices.push(i);
            continue;
        }
        let matched = false;
        for (const head of commit.heads) {
            if (pattern.test(head)) {
                matched = true;
                break;
            }
        }
        if (!matched) {
            for (const tag of commit.tags) {
                if (pattern.test(tag.name)) {
                    matched = true;
                    break;
                }
            }
        }
        if (!matched) {
            for (const remote of commit.remotes) {
                if (pattern.test(remote.name)) {
                    matched = true;
                    break;
                }
            }
        }
        if (matched) {
            indices.push(i);
        }
    }
    return { indices, error: null };
}
