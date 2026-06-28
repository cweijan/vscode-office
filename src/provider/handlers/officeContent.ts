import { spawn } from 'child_process';
import { basename, dirname, extname, isAbsolute, relative } from 'path';
import { extensions, Uri, workspace, type Webview } from 'vscode';
import { Handler } from '@/common/handler';
import { isUriReadOnly } from '@/common/fileReadOnly';
import { isWebExtensionHost } from '@/common/extensionHost';

export function isVirtualUri(uri: Uri): boolean {
    return uri.scheme !== 'file';
}

/** 与 markdown documentCacheId 一致，用于 webview localStorage 键前缀 */
export function buildDocumentCacheId(uri: Uri): string {
    return `${uri.scheme}:${uri.toString()}`;
}

interface GitUriQuery {
    path: string;
    ref: string;
    submoduleOf?: string;
}

interface GitRepository {
    rootUri: Uri;
}

interface GitApi {
    repositories: ReadonlyArray<GitRepository>;
    getRepository(uri: Uri): GitRepository | null;
    getRepositoryRoot(uri: Uri): Promise<Uri | null>;
}

interface GitExtensionExports {
    getAPI(version: 1): GitApi;
}

async function getGitApi(): Promise<GitApi | null> {
    const extension = extensions.getExtension<GitExtensionExports>('vscode.git');
    if (!extension) {
        return null;
    }
    if (!extension.isActive) {
        try {
            await extension.activate();
        } catch {
            return null;
        }
    }
    return extension.exports?.getAPI(1) ?? null;
}

async function findRepoRoot(gitUri: Uri, gitPath: string, filePath: string): Promise<string> {
    const api = await getGitApi();
    if (api) {
        const repo = api.getRepository(gitUri);
        if (repo?.rootUri.scheme === 'file') {
            return repo.rootUri.fsPath;
        }
        const rootUri = await api.getRepositoryRoot(gitUri);
        if (rootUri?.scheme === 'file') {
            return rootUri.fsPath;
        }
        for (const candidate of api.repositories) {
            if (candidate.rootUri.scheme !== 'file') {
                continue;
            }
            const repoRelative = relative(candidate.rootUri.fsPath, filePath);
            if (repoRelative && !repoRelative.startsWith('..') && !isAbsolute(repoRelative)) {
                return candidate.rootUri.fsPath;
            }
        }
    }
    return findRepoRootFromDisk(gitPath, filePath);
}

async function findRepoRootFromDisk(gitPath: string, filePath: string): Promise<string> {
    const cwd = dirname(filePath);
    const root = await spawnGitBinary(gitPath, cwd, ['rev-parse', '--show-toplevel']);
    return new TextDecoder().decode(root).trim();
}

function spawnGitBinary(gitPath: string, cwd: string, args: string[]): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
        const child = spawn(gitPath, args, { cwd });
        const stdout: Buffer[] = [];
        const stderr: Buffer[] = [];
        child.stdout?.on('data', (chunk: Buffer) => stdout.push(chunk));
        child.stderr?.on('data', (chunk: Buffer) => stderr.push(chunk));
        child.on('error', reject);
        child.on('close', (code) => {
            if (code !== 0) {
                const message = Buffer.concat(stderr).toString('utf8').trim();
                reject(new Error(message || `git exited with code ${code}`));
                return;
            }
            resolve(new Uint8Array(Buffer.concat(stdout)));
        });
    });
}

function resolveGitPath(): string {
    return workspace.getConfiguration('git').get<string>('path') ?? 'git.exe';
}

/** ref 末尾单独的 ^ 与后面的 :path 拼接时，部分环境下解析会失败，^1 语义等价于 ^ */
function normalizeGitRef(ref: string): string {
    return ref.endsWith('^') ? `${ref}1` : ref;
}

function buildGitObjectSpec(ref: string, relativePath: string): string {
    if (!ref) {
        return `:${relativePath}`;
    }
    return `${normalizeGitRef(ref)}:${relativePath}`;
}

/** git scheme 经 VS Code FS 会走 --textconv，Windows 上二进制会被当文本处理 */
async function readGitUriBytes(uri: Uri): Promise<Uint8Array> {
    const { path: filePath, ref, submoduleOf } = JSON.parse(uri.query) as GitUriQuery;
    if (submoduleOf) {
        return workspace.fs.readFile(uri);
    }
    const gitPath = resolveGitPath();
    const repoRoot = await findRepoRoot(uri, gitPath, filePath);
    const relativePath = relative(repoRoot, filePath).replace(/\\/g, '/');
    return spawnGitBinary(gitPath, repoRoot, ['show', buildGitObjectSpec(ref, relativePath)]);
}

export async function readUriBytes(uri: Uri): Promise<Uint8Array> {
    if (uri.scheme === 'git' && !isWebExtensionHost() && process.platform === 'win32' && (
        ['.pdf', '.docx'].includes(extname(uri.fsPath).toLowerCase())
    )) {
        try {
            return await readGitUriBytes(uri);
        } catch {
            return workspace.fs.readFile(uri);
        }
    }
    return workspace.fs.readFile(uri);
}

export async function readUriText(uri: Uri): Promise<string> {
    const data = await readUriBytes(uri);
    return new TextDecoder('utf-8').decode(data);
}

export function bytesToPayloadBuffer(data: Uint8Array): number[] {
    const buffer: number[] = new Array(data.length);
    for (let i = 0; i < data.length; i++) {
        buffer[i] = data[i];
    }
    return buffer;
}

export async function emitVirtualOfficeOpen(handler: Handler, uri: Uri): Promise<void> {
    const now = Date.now();
    const ext = extname(uri.fsPath);
    const readOnly = await isUriReadOnly(uri);
    try {
        const data = await readUriBytes(uri);
        const payload: Record<string, unknown> = {
            ext,
            path: uri.fsPath,
            fileName: basename(uri.fsPath),
            scheme: uri.scheme,
            documentCacheId: buildDocumentCacheId(uri),
            readOnly,
            nonce: now,
        };
        payload.buffer = bytesToPayloadBuffer(data);
        handler.emit('open', payload);
    } catch (error) {
        handler.emit('open', {
            ext,
            path: uri.fsPath,
            fileName: basename(uri.fsPath),
            scheme: uri.scheme,
            documentCacheId: buildDocumentCacheId(uri),
            readOnly,
            error: error instanceof Error ? error.message : 'Failed to read file',
            nonce: now,
        });
    }
}

export async function emitFileOfficeOpen(handler: Handler, uri: Uri, webview: Webview): Promise<void> {
    const now = Date.now();
    const readOnly = await isUriReadOnly(uri);
    handler.emit('open', {
        ext: extname(uri.fsPath),
        path: webview.asWebviewUri(uri).with({ query: `nonce=${now.toString()}` }).toString(),
        fileName: basename(uri.fsPath),
        documentCacheId: buildDocumentCacheId(uri),
        readOnly,
    });
}
