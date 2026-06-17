import { exec } from 'child_process';
import { access } from 'fs/promises';
import * as path from 'path';
import * as vscode from 'vscode';
import type { GitExecutable } from '../types/git';
import { UNABLE_TO_FIND_GIT_MSG } from './gitExecutor';

async function isExecutable(file: string): Promise<boolean> {
    try {
        await access(file);
        return true;
    } catch {
        return false;
    }
}

async function getGitExecutable(path: string): Promise<GitExecutable> {
    return new Promise((resolve, reject) => {
        exec(`"${path}" --version`, (err, stdout) => {
            if (err) return reject(err);
            const version = stdout.trim();
            if (!version.startsWith('git version')) return reject(new Error('Not a git executable'));
            resolve({ path, version });
        });
    });
}

function findGitOnDarwin(): Promise<GitExecutable> {
    return new Promise((resolve, reject) => {
        exec('which git', (err, stdout) => {
            if (err) return reject();
            const gitPath = stdout.trim();
            if (gitPath !== '/usr/bin/git') {
                getGitExecutable(gitPath).then(resolve, reject);
            } else {
                exec('xcode-select -p', (xcodeErr: NodeJS.ErrnoException | null) => {
                    if (xcodeErr?.code === 2) reject();
                    else getGitExecutable(gitPath).then(resolve, reject);
                });
            }
        });
    });
}

function findSystemGitWin32(pathBase?: string): Promise<GitExecutable> {
    return pathBase
        ? getGitExecutable(path.join(pathBase, 'Git', 'cmd', 'git.exe'))
        : Promise.reject();
}

async function findGitWin32InPath(): Promise<GitExecutable> {
    const dirs = (process.env.PATH || '').split(';');
    dirs.unshift(process.cwd());
    for (const dir of dirs) {
        const file = path.join(dir, 'git.exe');
        if (await isExecutable(file)) {
            try {
                return await getGitExecutable(file);
            } catch { /* continue */ }
        }
    }
    return Promise.reject();
}

function findGitOnWin32(): Promise<GitExecutable> {
    return findSystemGitWin32(process.env.ProgramW6432)
        .catch(() => findSystemGitWin32(process.env['ProgramFiles(x86)']))
        .catch(() => findSystemGitWin32(process.env.ProgramFiles))
        .catch(() => findSystemGitWin32(
            process.env.LocalAppData ? path.join(process.env.LocalAppData, 'Programs') : undefined
        ))
        .catch(() => findGitWin32InPath());
}

export async function findGit(): Promise<GitExecutable> {
    const configPath = vscode.workspace.getConfiguration('git').get<string>('path');
    if (configPath) {
        try {
            return await getGitExecutable(configPath);
        } catch { /* fall through */ }
    }

    switch (process.platform) {
        case 'darwin':
            return findGitOnDarwin();
        case 'win32':
            return findGitOnWin32();
        default:
            return getGitExecutable('git');
    }
}

export { UNABLE_TO_FIND_GIT_MSG };
