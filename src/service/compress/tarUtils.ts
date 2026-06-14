import format from 'date-format';
import { mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { Parser, ReadEntry } from 'tar';

function normalizeTarPath(path: string): string {
    return path.replace(/\\/g, '/').replace(/^\.\/+/, '').replace(/^\/+/, '');
}

function isTarDirectory(entry: ReadEntry): boolean {
    return entry.type === 'Directory'
        || entry.type === '5'
        || entry.path.endsWith('/');
}

export interface TarEntryInfo {
    path: string;
    size: number;
    isDirectory: boolean;
    mtime?: Date;
}

export async function listTarEntries(data: Buffer, gzip: boolean): Promise<TarEntryInfo[]> {
    const entries: TarEntryInfo[] = [];
    await new Promise<void>((resolve, reject) => {
        const parser = new Parser({
            gzip,
            onReadEntry: (entry: ReadEntry) => {
                const path = normalizeTarPath(entry.path);
                entries.push({
                    path,
                    size: entry.size,
                    isDirectory: isTarDirectory(entry),
                    mtime: entry.mtime,
                });
                entry.resume();
            },
        });
        parser.on('error', reject);
        parser.on('end', () => resolve());
        parser.write(data);
        parser.end();
    });
    return entries;
}

export function formatTarModifyTime(mtime?: Date): string | null {
    return mtime ? format('yyyy-MM-dd hh:mm:ss', mtime) : null;
}

export async function extractTarEntries(data: Buffer, destDir: string, gzip: boolean, entryNames?: string[]): Promise<void> {
    const filter = entryNames?.length
        ? (path: string) => entryNames.includes(normalizeTarPath(path))
        : undefined;

    const fileContents: { path: string; chunks: Buffer[] }[] = [];
    await new Promise<void>((resolve, reject) => {
        const parser = new Parser({
            gzip,
            filter,
            onReadEntry: (entry: ReadEntry) => {
                if (entry.type !== 'File') {
                    entry.resume();
                    return;
                }
                const path = normalizeTarPath(entry.path);
                const chunks: Buffer[] = [];
                entry.on('data', (chunk: Buffer) => chunks.push(chunk));
                entry.on('end', () => fileContents.push({ path, chunks }));
                entry.resume();
            },
        });
        parser.on('error', reject);
        parser.on('end', () => resolve());
        parser.write(data);
        parser.end();
    });

    for (const file of fileContents) {
        const filePath = resolve(destDir, file.path);
        mkdirSync(resolve(filePath, '..'), { recursive: true });
        writeFileSync(filePath, Buffer.concat(file.chunks));
    }
}
