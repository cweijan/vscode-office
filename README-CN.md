# vscode-office

扩展名字叫做Office Viewer是因为一开始是为了增强VSCode的预览功能, 增加了Excel, svg, pdf等的支持, 后来才增加了markdown的编辑器

Markdown编辑器使用了Vditor, 默认为白色, 如果想让背景色和VSCode主题一样, 可将以下设置加入到VSCode的设置中

```json
{
    "vscode-office.autoTheme": true
}
```

需要临时使用VSCode内置编辑器, 可点击以下按钮
![](image/README-CN/1640579182342.png)

点击以下按钮可将Markdown导出为Pdf, 需要确保你安装了Chrome或Edge浏览器
![](image/README-CN/1640579380584.png)

## HTML

对Html编辑功能进行了增强, 编辑中按下ctrl+shift+v可实时预览.
