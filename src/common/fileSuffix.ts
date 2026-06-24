import { extname } from 'path';

export function getFileSuffix(fsPath: string): string {
	const lower = fsPath.toLowerCase();
	if (lower.endsWith('.tar.gz') || lower.endsWith('.tgz')) {
		return '.tar.gz';
	}
	return extname(lower);
}
