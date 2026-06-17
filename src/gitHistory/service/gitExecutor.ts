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
    const stderrStr = stderr.toString().trim();
    if (stderrStr) return stderrStr.split(EOL_REGEX)[0];
    const stdoutStr = stdout.toString().trim();
    if (stdoutStr) return stdoutStr.split(EOL_REGEX)[0];
    return 'Git command failed';
}

export class GitExecutor {
    constructor(private readonly gitExecutable: GitExecutable) { }

    spawn<T>(args: string[], repo: string, resolveValue: (stdout: string) => T): Promise<T> {
        return new Promise((resolve, reject) => {
            const child = spawn(this.gitExecutable.path, args, {
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
                    resolve(resolveValue(stdout.toString()));
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
