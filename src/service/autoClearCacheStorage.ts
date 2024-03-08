import { Output } from "@/common/Output";
import { existsSync, rm } from "fs";
import { homedir } from "os";
import { join } from "path";

/*
旧版本的VS Code每次打开webview都会对资源文件进行缓存, 导致占用大量空间, 新版本不会再重复缓存, 因此不再需要自动清理了.
缓存路径:
- Windows: C:\Users\<userid>\AppData\Roaming\Code\Service Worker\CacheStorage
- Linux: /home/<userid>/.config/Code/Service Worker/CacheStorage
- macOS: /Users/<userid>/Library/Application Support/Code/Service Worker/CacheStorage
*/
export function autoClearCacheStorage() {
	const dir = join(homedir(), 'AppData/Roaming/Code/Service Worker/CacheStorage')
	if (!existsSync(dir)) return;
	rm(dir, { recursive: true, force: true }, (err: Error) => {
		Output.debug(err)
	});
}
