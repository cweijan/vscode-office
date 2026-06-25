import * as vscode from 'vscode';

function slugifyHeading(text: string): string {
    return text
        .trim()
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s-]/gu, '')
        .replace(/\s+/g, '-');
}

export function findFragmentPosition(doc: vscode.TextDocument, fragment: string): vscode.Position | null {
    if (!fragment) {
        return null;
    }
    if (fragment.startsWith('^')) {
        for (let i = 0; i < doc.lineCount; i++) {
            if (doc.lineAt(i).text.includes(fragment)) {
                return new vscode.Position(i, 0);
            }
        }
        return null;
    }
    const headingText = decodeURIComponent(fragment.replace(/\+/g, ' '));
    for (let i = 0; i < doc.lineCount; i++) {
        const line = doc.lineAt(i).text;
        const match = line.match(/^#{1,6}\s+(.+?)(?:\s+#+\s*)?$/);
        if (!match) {
            continue;
        }
        const title = match[1].trim();
        if (title === headingText || slugifyHeading(title) === headingText) {
            return new vscode.Position(i, 0);
        }
    }
    return null;
}
