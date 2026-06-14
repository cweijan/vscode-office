import { basename, extname, join, parse, resolve } from 'path';
import { commands, Uri } from 'vscode';

export function getFileSuffix(fsPath: string): string {
    const lower = fsPath.toLowerCase();
    if (lower.endsWith('.tar.gz') || lower.endsWith('.tgz')) return '.tar.gz';
    return extname(lower);
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

export function planExtractTarget(archivePath: string, fileCount: number): ExtractPlan {
    const parentDir = resolve(archivePath, '..');
    const createSubfolder = fileCount > 1;
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
    return plan.targetDir;
}

export async function revealExtractResult(plan: ExtractPlan, extractedPaths: string[]) {
    const revealPath = getRevealPathAfterExtract(plan, extractedPaths);
    await commands.executeCommand('revealFileInOS', Uri.file(revealPath));
}
