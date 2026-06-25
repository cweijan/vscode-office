import { dirname } from 'path';

/** 从当前笔记目录向上到工作区根，作为 Obsidian 笔记库根的候选 */
export function buildSearchRoots(currentDir: string, workspacePath?: string): string[] {
    const roots: string[] = [];
    let dir = currentDir;
    while (true) {
        roots.push(dir);
        if (workspacePath && dir === workspacePath) {
            break;
        }
        const parent = dirname(dir);
        if (parent === dir) {
            break;
        }
        dir = parent;
    }
    return roots;
}
