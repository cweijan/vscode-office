import { env, type ExtensionContext } from 'vscode';
import { Output } from '@/common/Output';
import { isWebExtensionHost } from '@/common/extensionHost';
import { existsSync } from 'fs';
import { rm } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';

const WEB_STORAGE_CLEARED_KEY = 'office.legacyWebStorageCleared';

/*
旧版 webview 通过 URL 加载会无限膨胀 WebStorage，该问题已修复。
此处仅对存量用户做一次迁移清理，完成后不再执行。

缓存路径（<Product> 为 Code、Cursor、Code - Insiders 等）:
- Windows: %APPDATA%\<Product>\WebStorage
- Linux: ~/.config/<Product>/WebStorage
- macOS: ~/Library/Application Support/<Product>/WebStorage
*/

function resolveProductDataDir(): string {
	const appName = env.appName;
	if (/cursor/i.test(appName)) {
		return 'Cursor';
	}
	if (/insiders/i.test(appName)) {
		return 'Code - Insiders';
	}
	if (/codium/i.test(appName)) {
		return 'VSCodium';
	}
	return 'Code';
}

function resolveWebStorageDir(): string {
	const product = resolveProductDataDir();
	const home = homedir();
	switch (process.platform) {
		case 'win32':
			return join(process.env.APPDATA ?? join(home, 'AppData', 'Roaming'), product, 'WebStorage');
		case 'darwin':
			return join(home, 'Library', 'Application Support', product, 'WebStorage');
		default:
			return join(home, '.config', product, 'WebStorage');
	}
}

/** 一次性清理旧版 webview 遗留的 WebStorage 缓存 */
export async function autoClearCacheStorage(context: ExtensionContext) {
	if (isWebExtensionHost()) {
		return;
	}
	if (context.globalState.get<boolean>(WEB_STORAGE_CLEARED_KEY)) {
		return;
	}
	const dir = resolveWebStorageDir();
	if (!existsSync(dir)) {
		await context.globalState.update(WEB_STORAGE_CLEARED_KEY, true);
		return;
	}
	try {
		await rm(dir, { recursive: true, force: true });
	} catch (err) {
		Output.debug(err);
		return;
	}
	await context.globalState.update(WEB_STORAGE_CLEARED_KEY, true);
}
