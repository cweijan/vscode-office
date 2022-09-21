# Office Viewer

## 介绍

该扩展在vscode内集成[Vditor](https://github.com/Vanessa219/vditor)(针对VSCode做了些[兼容性改动](https://github.com/vscode-ext-studio/vditor)), 实现了对markdown的所见即所得编辑, 相比typora的特性:

- 开源免费无广告无隐私追踪 (如果对你有帮助考虑点下star(●'◡'●))
- 在最新版本中优化了vscode主题支持, 现在颜色默认跟随vscode主题
- vscode内置了git, 创建一个git仓库就可以对markdown进行版本管理
- 支持多窗口打开markdown (typora只支持mac)
- 相比typora的缺点: 对代码块, latex公式和图形支持度不高.

扩展名字叫做Office Viewer是因为一开始是为了增强VSCode的预览功能, 增加了Excel, svg, pdf等的支持, 后来才增加markdown编辑器, 同时为了精简本人安装的扩展, 集成了一个文件主题和颜色主题.

使用说明:

- 编辑方式: 直接通过vscode打开md文件
- 编辑器内, 通过Ctrl+单击或者双击可打开超链接
- 需要临时使用VSCode内置编辑器, 可点击以下按钮
  ![img](image/README-CN/1640579182342.png)
- 点击以下按钮可将Markdown导出为PDF, 需要机器上有安装Chrome或Edge浏览器
  ![img](image/README-CN/1640579380584.png)

VSCode加载webview时会生成缓存, 故该扩展每次启动时会自动进行清理. MAC OS和Linux未测试, 有使用相关的系统的可以帮忙看看哪里创建了CacheStorage.

## 贡献指南

由于是开源软件,  有其他人的参与才能让这个扩展变得更好, 开发流程:

1. fork并clone这个项目
2. 安装依赖: 在终端内进入项目目录, 输入npm i
3. vscode打开项目, 在扩展面板点击运行按钮即可运行扩展
4. 开发完成后提交pull request到这个仓库

![1663224731812](image/README-CN/1663224731812.png)

## 其他功能

- 文件主题: 内置了Material Icon Theme部分icon
- Excel: 支持对xlsx, csv等excel文件进行预览和保存(注意xlsx保存会丢失格式, csv则不支持gbk中文)
- html: 编辑HTML的过程中按下ctrl+shift+v可实时预览.
- Pdf: 支持直接预览pdf文件
- 自动清理缓存: vscode每次加载markdown编辑器时，会缓存其webview相关文件（3M多）。为了避免无限膨胀，本扩展在激活时会自动清空vscode的对应缓存文件夹。
