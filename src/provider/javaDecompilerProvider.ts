import { execFile } from 'child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'fs';
import { tmpdir } from 'os';
import { join, parse } from 'path';
import { promisify } from 'util';
import {
    CancellationToken,
    Event,
    EventEmitter,
    ExtensionContext,
    languages,
    TextDocumentContentProvider,
    Uri,
    window,
    workspace,
} from 'vscode';
import { extensionResource } from '@/common/extensionResource';

const execFileAsync = promisify(execFile);

function cacheKey(classPath: string, mtimeMs: number): string {
    return `${classPath}\0${mtimeMs}`;
}

function classPathToJavaPath(classPath: string): string {
    return classPath.replace(/\.class$/i, '.java');
}

function parseClassPath(uri: Uri): string {
    return uri.fsPath.replace(/\.java$/i, '.class');
}

export function createDecompileJavaUri(classPath: string): Uri {
    const javaPath = classPathToJavaPath(classPath);
    let mtimeMs = 0;
    try {
        mtimeMs = statSync(classPath).mtimeMs;
    } catch {
        // ignore
    }
    return Uri.file(javaPath).with({
        scheme: 'decompile_java',
        query: mtimeMs > 0 ? mtimeMs.toString() : undefined,
    });
}

export async function openDecompiledClass(classPath: string): Promise<void> {
    const uri = createDecompileJavaUri(classPath);
    try {
        const doc = await workspace.openTextDocument(uri);
        await languages.setTextDocumentLanguage(doc, 'java');
        await window.showTextDocument(doc, { preview: true });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await window.showErrorMessage(`Java decompile failed: ${message}`);
    }
}

export class JavaDecompilerProvider implements TextDocumentContentProvider {
    private readonly changeEmitter = new EventEmitter<Uri>();
    readonly onDidChange?: Event<Uri> = this.changeEmitter.event;

    private readonly cache = new Map<string, string>();
    private readonly decompilerJar: string;

    constructor(context: ExtensionContext) {
        this.decompilerJar = extensionResource(context, 'resource', 'java-decompiler.jar').fsPath;
    }

    async provideTextDocumentContent(uri: Uri, _token: CancellationToken): Promise<string> {
        const classPath = parseClassPath(uri);
        let mtimeMs = 0;
        try {
            mtimeMs = statSync(classPath).mtimeMs;
        } catch {
            throw new Error(`Class file not found: ${classPath}`);
        }

        const key = cacheKey(classPath, mtimeMs);
        const cached = this.cache.get(key);
        if (cached !== undefined) {
            return cached;
        }

        const content = await this.decompileClass(classPath);
        this.cache.set(key, content);
        return content;
    }

    private async decompileClass(classPath: string): Promise<string> {
        const tempDir = mkdtempSync(join(tmpdir(), 'office-decompile-'));
        try {
            await execFileAsync('java', [
                '-cp', this.decompilerJar,
                'org.jetbrains.java.decompiler.main.decompiler.ConsoleDecompiler',
                classPath,
                tempDir,
            ], { maxBuffer: 16 * 1024 * 1024 });

            const javaFile = join(tempDir, `${parse(classPath).name.replace(/\.class$/i, '')}.java`);
            if (!existsSync(javaFile)) {
                throw new Error(`Decompiler produced no output for ${classPath}`);
            }
            return readFileSync(javaFile, 'utf8');
        } finally {
            rmSync(tempDir, { recursive: true, force: true });
        }
    }
}
