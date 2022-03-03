# vscode-office

扩展名字叫做Office Viewer是因为一开始是为了增强VSCode的预览功能, 增加了Excel, svg, pdf等的支持, 后来才增加了markdown的编辑器

版本2.5.0之后通过Ctrl+单击或者双击打开超链接

Markdown编辑器使用了[Vditor](https://github.com/Vanessa219/vditor), 默认为白色, 如果想让背景色和VSCode主题一样, 可将以下设置加入到VSCode的设置中

```json
{
    "vscode-office.autoTheme": true
}
```

需要临时使用VSCode内置编辑器, 可点击以下按钮
![](image/README-CN/1640579182342.png)

点击以下按钮可将Markdown导出为Pdf, 需要确保你安装了Chrome或Edge浏览器
![](image/README-CN/1640579380584.png)

补充说明: 
1. 开源的markdown编辑组件在功能上相比Typora较弱, 但现在已经满足我的需求, 扩展不会再频繁更新.
2. 相比Typora的优点是可以进行版本管理、打开多个文件, 在一个窗口同时打开多个文件.
3. 由于vscode每次加载webview都会进行缓存, 这个扩展每次会生成3M多, 建议定期进行清理, 打开缓存路径删除所有文件.
   - Windows: C:\Users\[用户名]\AppData\Roaming\Code\Service Worker\CacheStorage
   - 其他: %appdata%\Roaming\Code\Service Worker\CacheStorage.


## HTML

对Html编辑功能进行了增强, 编辑中按下ctrl+shift+v可实时预览.
