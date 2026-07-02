import { spawn } from 'child_process';
import type { GitExecutable } from '../types/git';

export const UNABLE_TO_FIND_GIT_MSG =
    'Unable to find Git. Install Git or set "git.path" in VS Code settings.';

const EOL_REGEX = /\r\n|\r|\n/;

function resolveSpawnOutput(
    child: ReturnType<typeof spawn>
): Promise<[number | null, NodeJS.Signals | null, Buffer, Buffer, Error | null]> {
    return new Promise((resolve) => {
        const stdout: Buffer[] = [];
        const stderr: Buffer[] = [];
        let error: Error | null = null;
        child.stdout?.on('data', (chunk: Buffer) => stdout.push(chunk));
        child.stderr?.on('data', (chunk: Buffer) => stderr.push(chunk));
        child.on('error', (err) => { error = err; });
        child.on('close', (code, signal) => {
            resolve([code, signal, Buffer.concat(stdout), Buffer.concat(stderr), error]);
        });
    });
}

function getErrorMessage(error: Error | null, stdout: Buffer, stderr: Buffer): string {
    if (error) return error.message;
    const stderrLines = stderr.toString().split(EOL_REGEX).map((line) => line.trim()).filter(Boolean);
    const stdoutLines = stdout.toString().split(EOL_REGEX).map((line) => line.trim()).filter(Boolean);
    const lines = [...stderrLines, ...stdoutLines];
    const priorityLine = lines.find((line) =>
        /fatal|error|conflict|failed|aborting|cannot|could not|already exists/i.test(line)
    );
    if (priorityLine) return priorityLine;
    if (stderrLines.length > 0) return stderrLines[0];
    if (stdoutLines.length > 0) return stdoutLines[stdoutLines.length - 1];
    return 'Git command failed';
}

function getWarningMessage(stderr: Buffer): string | null {
    const stderrLines = stderr.toString().split(EOL_REGEX).map((line) => line.trim()).filter(Boolean);
    if (stderrLines.length === 0) {
        return null;
    }
    const priorityLine = stderrLines.find((line) =>
        /warning|ambiguous|deprecated|detached head/i.test(line)
    );
    return priorityLine ?? stderrLines[0];
}

export interface GitSpawnResult<T> {
    value: T;
    warning: string | null;
}

export class GitExecutor {
    constructor(private readonly gitExecutable: GitExecutable) { }

    spawn<T>(args: string[], repo: string, resolveValue: (stdout: string) => T): Promise<T> {
        return this.spawnWithWarning(args, repo, resolveValue).then((result) => result.value);
    }

    spawnWithWarning<T>(args: string[], repo: string, resolveValue: (stdout: string) => T): Promise<GitSpawnResult<T>> {
        return new Promise((resolve, reject) => {
            // Force UTF-8 output encoding for all git commands to ensure non-ASCII
            // characters (e.g. Chinese, Japanese, Korean) are not garbled on Windows
            // systems where the locale encoding may differ from UTF-8.
            const child = spawn(this.gitExecutable.path, ['-c', 'i18n.logOutputEncoding=utf-8', ...args], {
                cwd: repo,
                env: process.env,
            });
            resolveSpawnOutput(child).then(([code, signal, stdout, stderr, error]) => {
                if (error) return reject(getErrorMessage(error, stdout, stderr));
                if (signal) return reject(`Git process killed by signal ${signal}`);
                if (code !== 0) {
                    return reject(getErrorMessage(null, stdout, stderr));
                }
                try {
                    resolve({
                        value: resolveValue(stdout.toString()),
                        warning: getWarningMessage(stderr),
                    });
                } catch (e) {
                    reject(e instanceof Error ? e.message : String(e));
                }
            });
        });
    }

    async repoRoot(pathOfPotentialRepo: string): Promise<string | null> {
        try {
            const root = await this.spawn(
                ['rev-parse', '--show-toplevel'],
                pathOfPotentialRepo,
                (stdout) => stdout.trim().replace(/\\/g, '/')
            );
            return root || null;
        } catch {
            return null;
        }
    }
}
