# HyperMD

![HyperMD Markdown Editor](../../demo/logo.png)

**打破** Markdown *写作* 和 *预览* 的 **次元壁**！

[![NPM version](https://img.shields.io/npm/v/hypermd.svg?style=flat-square)](https://npmjs.org/package/hypermd) [![Build Status](https://travis-ci.org/laobubu/HyperMD.svg?branch=master)](https://travis-ci.org/laobubu/HyperMD)

[在线体验](https://laobubu.net/HyperMD/) | [功能演示][examples] | [开发文档][doc]

[English](../../README.md)


## [快速开始](./quick-start.md)

```javascript
// npm install --save hypermd codemirror
var HyperMD = require('hypermd')
var myTextarea = document.getElementById('input-area')
var editor = HyperMD.fromTextArea(myTextarea)
```

[![Remix on Glitch](https://cdn.glitch.com/2703baf2-b643-4da7-ab91-7ee2a2d00b5b%2Fremix-button.svg)](https://glitch.com/edit/#!/remix/hello-hypermd)

适用于 RequireJS, Parcel, webpack, 或者用各种HTML标签来引入库的纯粹的环境。 [参考文档](./quick-start.md)

## 选择 HyperMD 的 N 个理由

HyperMD 是一组 [CodeMirror][] 插件、模式、主题、编辑器命令（Commands）和按键绑定（KeyMap）等。

你可以在一个页面上同时使用 HyperMD 和 CodeMirror。

### 🌈 写作与预览，只需一个框

- **各种常规 Markdown 元素**
  + **粗体字**、*斜体字*、~~删除线~~、`Code`
  + [链接](https://laobubu.net)、图片
  + 标题 / 引用块 / 代码块 / 列表 / 水平分割线
- **扩展的 Markdown 语法**
  + 简单表格
  + 脚注 [^1]
  + [x] TODO 列表 (可点击勾选框, 改变状态)
  + YAML Front Matter
  - $\LaTeX$ 公式，同时支持行内块与多行公式 [^4]
  - Emoji `:joy:` => :joy: [(支持自定义的表情)](https://laobubu.net/HyperMD/docs/examples/custom-emoji.html)
- **以及一些特殊玩法**，例如……
  + <span style="color:red">在 Markdown 里嵌入 HTML 标签</span> -- WYSIWIG MDX 了解一下
  + 支持 #话题标签 [^6] ，[查看演示](https://laobubu.net/HyperMD/docs/examples/hashtag.html)
  + 流程图 和 图表 ([mermaid](https://laobubu.net/HyperMD/docs/examples/mermaid.html) 或者 [flowchart.js](https://laobubu.net/HyperMD/docs/examples/flowchart.html))

### 💪 更好的 **Markdown 写作体验**

- 复制粘贴，或者拖拽文件，即可 **上传图片** 和文件
- **按着 Alt 点击** 可以打开链接，或者跳到脚注 [^1]
- **鼠标悬停** 可以查看脚注内容
- **复制粘贴** 自动转换网页内容为 Markdown [^5]
- 好用的 **按键绑定** (也叫做 KeyMap)

### 🎁 **CodeMirror** 的好处，这里都有份

- **代码块语法高亮** 支持数百种语言 [^2]。高亮规则可按需动态载入。
- 灵活可配置的按键绑定与 CodeMirror API
- Diff and Merge
- 各种主题 [^3]
- **绝大多数 CodeMirror 插件** 都可在 HyperMD 里使用

### 🔨 可扩展，可配置

- **Power Pack** 机制，用各种第三方库和服务增强 HyperMD 功能
   - 例如 [MathJax][], [marked][], [KaTeX][] ...
   - *[详细列表](https://laobubu.net/HyperMD/#./docs/powerpacks.md)*
- HyperMD 本身也是很模块化的。

### 🎹 特制的按键绑定(**KeyMap**) "HyperMD":

+ **表格**
  - <kbd>回车</kbd> 使用 `| column | line |` 创建表格
  - <kbd>回车</kbd> 插入一行或者结束表格（如果最后一行的格子都是空的）
  - <kbd>Tab</kbd> 和 <kbd>Shift-Tab</kbd> 在表格间切换
+ **列表**
  - <kbd>Tab</kbd> 和 <kbd>Shift-Tab</kbd> 改变当前列表项的缩进
+ **格式化** 光标旁边的单词（或者选中的文字）
  - <kbd>Ctrl+B</kbd> **加粗**
  - <kbd>Ctrl+I</kbd> *斜体*
  - <kbd>Ctrl+D</kbd> ~~删除线~~


## 特别感谢

💎 **服务和资源**

<table>
  <tr>
    <td width="50%">
      <b><a href="https://icomoon.io/#icons-icomoon">IcoMoon</a> - The IconPack(免费版)</b><br>
      <small>
        <em>Demo Page</em> uses IcoMoon icons. Related files are stored in <a href="https://github.com/laobubu/HyperMD/tree/master/demo/svgicon">demo/svgicon</a>.
      </small>
    </td>
    <td>
      <b><a href="http://www.codecogs.com">CodeCogs</a> - An Open Source Scientific Library</b><br>
      <small>
        <em>FoldMath</em> uses codecogs' service as the default TeX MathRenderer.<br>
        (You may load PowerPack to use other renderer, eg. KaTeX or MathJax)
      </small>
    </td>
  </tr>
  <tr>
    <td>
      <b><a href="https://sm.ms/">SM.MS</a> - 免费图床服务</b><br>
      <small>
        <em>在线演示页</em> 和 <em>PowerPack/insert-file-with-smms</em> 使用了 SM.MS 开放API来上传和存储用户插入的图片。<br>
        (若你想在你的编辑器里使用 SM.MS 服务，请使用对应 PowerPack)
      </small>
    </td>
    <td>
      <b><a href="https://www.emojione.com/">EmojiOne</a> - 开放的 emoji 表情图标</b><br>
      <small>
        <em>在线演示页</em> 和 <em>PowerPack/fold-emoji-with-emojione</em> 使用了
        <a href="https://www.emojione.com/">EmojiOne</a> 免费提供的 emoji 表情图标
        <a href="https://www.emojione.com/licenses/free"><em>(免费版许可)</em></a><br>
        （你也可以使用其他图标库，例如来自 twitter 的 twemoji）
      </small>
    </td>
  </tr>
  <tr>
    <td>
      <b><a href="https://codemirror.net/">CodeMirror</a></b> - In-browser code editor.<br>
      <b><a href="http://requirejs.org/">RequireJS</a></b> - A JavaScript AMD module loader.<br>
      <b><a href="https://khan.github.io/KaTeX/">KaTeX</a></b> - The fastest math typesetting library for the web.<br>
      <b><a href="https://github.com/chjj/marked/">marked</a></b>,
      <b><a href="https://github.com/domchristie/turndown/">turndown</a></b>
      and more remarkable libs.
      <br>
    </td>
  </tr>
</table>


🌟 **Sponsors**

<table>
  <tr>
    <td><a href="http://www.umbst.com/" target="_blank"><img src="http://www.umbst.com/images/logo.svg" height="38" width="38" title="圆伞科技"></a></td>
  </tr>
</table>


🙏 **Sponsors** _(按日期排序)_

<div class="sponsors">
  <span>☕Phithon</span> <span>☕c*i</span> <span>☕*Yuan</span> <span>☕*Xiuzhang</span>
  <span>☕*Junjie</span> <span>🌟圆伞科技</span> <span>☕*Di</span>
</div>


## 一起来搞事

HyperMD 是 [laobubu][] 的一个开源项目，欢迎你：

- [在 GitHub 贡献代码](https://github.com/laobubu/HyperMD/) ，编写你的组件和主题
- [帮我买杯咖啡](https://laobubu.net/donate.html)
- 将 HyperMD 分享给更多人



-------------------------------------------------------
[CodeMirror]: https://codemirror.net/   很强的网页端文本编辑器
[RequireJS]:  http://requirejs.org/   用于 JavaScript 的 AMD 模块加载器
[MathJax]:  https://www.mathjax.org/  支持 Tex 的数学公式渲染组件
[marked]:   https://github.com/chjj/marked/  一个 markdown 解析器和渲染器
[turndown]: https://github.com/domchristie/turndown 一个 HTML 转 Markdown 的组件
[turndown-plugin-gfm]: https://github.com/domchristie/turndown-plugin-gfm 为 turndown 添加删除线和表格支持
[katex]: https://khan.github.io/KaTeX/
[laobubu]:  https://laobubu.net/  HyperMD 的作者
[doc]: ./index.md
[examples]: https://laobubu.net/HyperMD/docs/examples/

[^1]: 按着 Ctrl 点击也行
[^2]: 只要是 CodeMirror 支持的都能用
[^3]: 如果主题没有为 HyperMD 特殊设计，那么用起来可能会有点难受
[^4]: 公式块和代码块类似， 使用 `$$` 包裹你的公式，支持多行
[^5]: 使用 `Ctrl+Shift+V` 可以粘贴纯文本
[^6]: 此功能默认不启用，开启方法请参阅文档； #用两个井号 打 带空格的标签#
