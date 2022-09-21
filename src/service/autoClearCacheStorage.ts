/*
本扩展的 markdown 编辑器会创建 WebView 实例，而 VS Code 则每次都随之在 "Service Worker\CacheStorage" 里创建对应的缓存文件。但之后，这些文件不会被自动清理……
为了避免无限膨胀，就需要你时不时地去手动清理。显然，这样做是个麻烦，所以应当自动化。

该缓存文件夹的具体位置为：
%appdata%\Roaming\Code\Service Worker\CacheStorage
而 %appdata% 在 Windows 里，是 C:\Users\你的用户名\AppData
*/
import LocalFile from "../common/LocalFile"
const home_dir = require('os').homedir()

/**
 * 清空vscode webview缓存
 */
export function autoClearCacheStorage() {
	try {
		// console.log('home_dir', home_dir)
		const cache_dir = LocalFile.join( home_dir, 'AppData/Roaming/Code/Service Worker/CacheStorage' )
		cache_dir.clear()
	} catch (error) {
		console.log(error)
	}
}
