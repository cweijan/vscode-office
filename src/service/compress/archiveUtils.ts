import { basename, extname, join, parse, resolve } from 'path';
import { commands, Uri } from 'vscode';

export function getFileSuffix(fsPath: string): string {
    const lower = fsPath.toLowerCase();
    if (lower.endsWith('.tar.gz') || lower.endsWith('.tgz')) return '.tar.gz';
    return extname(lower);
}

/** CRX (Chrome extension) wraps a ZIP payload after a binary header. */
export function unwrapCrx(data: Buffer): { payload: Buffer; prefix?: Buffer } {
    if (data.length < 12 || data.toString('ascii', 0, 4) !== 'Cr24') {
        return { payload: data };
    }
    const version = data.readUInt32LE(4);
    if (version === 2) {
        if (data.length < 16) {
            return { payload: data };
        }
        const pubKeyLength = data.readUInt32LE(8);
        const sigLength = data.readUInt32LE(12);
        const headerEnd = 16 + pubKeyLength + sigLength;
        if (headerEnd > data.length) {
            return { payload: data };
        }
        return {
            prefix: data.subarray(0, headerEnd),
            payload: data.subarray(headerEnd),
        };
    }
    if (version === 3) {
        const headerSize = data.readUInt32LE(8);
        const headerEnd = 12 + headerSize;
        if (headerEnd > data.length) {
            return { payload: data };
        }
        return {
            prefix: data.subarray(0, headerEnd),
            payload: data.subarray(headerEnd),
        };
    }
    return { payload: data };
}

export function getArchiveBaseName(fsPath: string): string {
    const lower = fsPath.toLowerCase();
    const name = basename(fsPath);
    if (lower.endsWith('.tar.gz')) return name.slice(0, -7);
    if (lower.endsWith('.tgz')) return name.slice(0, -4);
    return parse(fsPath).name;
}

export interface ExtractPlan {
    targetDir: string;
    createSubfolder: boolean;
}

export function planExtractTarget(archivePath: string, rootItemCount: number): ExtractPlan {
    const parentDir = resolve(archivePath, '..');
    const createSubfolder = rootItemCount > 1;
    return {
        targetDir: createSubfolder ? join(parentDir, getArchiveBaseName(archivePath)) : parentDir,
        createSubfolder,
    };
}

export function getRevealPathAfterExtract(plan: ExtractPlan, extractedPaths: string[]): string {
    if (plan.createSubfolder) {
        return plan.targetDir;
    }
    if (extractedPaths.length === 1) {
        return resolve(plan.targetDir, extractedPaths[0]);
    }
    let commonRoot: string | null = null;
    for (const path of extractedPaths) {
        const root = path.includes('/') ? path.split('/')[0] : path;
        if (commonRoot === null) {
            commonRoot = root;
        } else if (commonRoot !== root) {
            commonRoot = null;
            break;
        }
    }
    if (commonRoot) {
        return resolve(plan.targetDir, commonRoot);
    }
    return plan.targetDir;
}

export async function revealExtractResult(plan: ExtractPlan, extractedPaths: string[]) {
    const revealPath = getRevealPathAfterExtract(plan, extractedPaths);
    await commands.executeCommand('revealFileInOS', Uri.file(revealPath));
}
