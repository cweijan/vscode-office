import * as vscode from 'vscode';

const WEBVIEW_ROOT_AUTHORITY = 'vscode-resource.vscode-cdn.net';

function decodeAuthority(authority: string): string {
    return authority.replace(/-([0-9a-f]{4})/gi, (_, code) =>
        String.fromCharCode(parseInt(code, 16))
    );
}

/**
 * Parse a webview resource URI back to the original local/remote URI.
 *
 * VS Code transforms URIs via `webview.asWebviewUri` into:
 * `https://${scheme}+${encodedAuthority}.vscode-resource.vscode-cdn.net/${path}`
 */
export function parseWebviewResourceUri(linkUri: string): vscode.Uri | undefined {
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
