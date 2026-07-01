import * as vscode from 'vscode';

const WEBVIEW_ROOT_AUTHORITY = 'vscode-resource.vscode-cdn.net';
const SCHEME_PREFIX_REG = /^[a-z][a-z0-9+.-]*:/i;

function decodeAuthority(authority: string): string {
    return authority.replace(/-([0-9a-f]{4})/gi, (_, code) =>
        String.fromCharCode(parseInt(code, 16))
    );
}

function splitPathQueryFragment(linkUri: string): { path: string; query: string; fragment: string } {
    const hashIndex = linkUri.indexOf('#');
    const withoutFragment = hashIndex < 0 ? linkUri : linkUri.slice(0, hashIndex);
    const fragment = hashIndex < 0 ? '' : linkUri.slice(hashIndex + 1);
    const queryIndex = withoutFragment.indexOf('?');
    const path = queryIndex < 0 ? withoutFragment : withoutFragment.slice(0, queryIndex);
    const query = queryIndex < 0 ? '' : withoutFragment.slice(queryIndex + 1);
    return { path, query, fragment };
}

function isLocalRelativePath(linkUri: string): boolean {
    const { path } = splitPathQueryFragment(linkUri);
    if (!path) {
        return false;
    }
    if (path.startsWith('/')) {
        return false;
    }
    if (/^[a-zA-Z]:[\\/]/.test(path)) {
        return false;
    }
    return true;
}

function resolveRelativeUri(linkUri: string, baseUri: vscode.Uri): vscode.Uri | undefined {
    const { path, query, fragment } = splitPathQueryFragment(linkUri);
    if (!path) {
        return undefined;
    }

    const baseDir = vscode.Uri.joinPath(baseUri.with({ query: '', fragment: '' }), '..');
    const segments = path.split(/[/\\]+/).filter(Boolean);
    let resolved = baseDir;
    for (const segment of segments) {
        if (segment === '.') {
            continue;
        }
        if (segment === '..') {
            resolved = vscode.Uri.joinPath(resolved, '..');
            continue;
        }
        resolved = vscode.Uri.joinPath(resolved, segment);
    }

    return resolved.with({ query, fragment });
}

function parseWebviewCdnUri(linkUri: string): vscode.Uri | undefined {
    let parsed: vscode.Uri;
    try {
        parsed = vscode.Uri.parse(linkUri);
    } catch {
        return undefined;
    }

    const authority = parsed.authority;
    const suffix = `.${WEBVIEW_ROOT_AUTHORITY}`;
    if (parsed.scheme !== 'https' || !authority.endsWith(suffix)) {
        return undefined;
    }

    const schemeAndAuthority = authority.slice(0, -suffix.length);
    const plusIndex = schemeAndAuthority.indexOf('+');
    if (plusIndex < 0) {
        return undefined;
    }

    const scheme = schemeAndAuthority.slice(0, plusIndex);
    const encodedAuthority = schemeAndAuthority.slice(plusIndex + 1);

    return vscode.Uri.from({
        scheme,
        authority: decodeAuthority(encodedAuthority),
        path: parsed.path,
        query: parsed.query,
        fragment: parsed.fragment,
    });
}

/**
 * Parse a webview resource URI back to the original local/remote URI.
 *
 * VS Code transforms URIs via `webview.asWebviewUri` into:
 * `https://${scheme}+${encodedAuthority}.vscode-resource.vscode-cdn.net/${path}`
 *
 * When `baseUri` is provided, local relative paths such as `./file.md` or `../images/a.png`
 * are resolved against the parent directory of `baseUri`.
 */
export function parseWebviewResourceUri(linkUri: string, baseUri?: vscode.Uri): vscode.Uri | undefined {
    const fromWebview = parseWebviewCdnUri(linkUri);
    if (fromWebview) {
        return fromWebview;
    }

    if (linkUri.startsWith('file:')) {
        try {
            return vscode.Uri.parse(linkUri);
        } catch {
            return undefined;
        }
    }

    if (!baseUri || !isLocalRelativePath(linkUri) || SCHEME_PREFIX_REG.test(linkUri)) {
        return undefined;
    }

    return resolveRelativeUri(linkUri, baseUri);
}
