# QMD 语法支持实现完成

## ✅ 已完成功能

### 1. QMD 预处理器
- ✅ **JavaScript 版本** (`src/service/markdown/qmd-preprocessor.js`) - 用于 PDF 导出
- ✅ **TypeScript 版本** (`src/service/qmdPreprocessor.ts`) - 用于编辑器预览

### 2. 支持的 QMD 语法
- ✅ **Callout blocks**: 5 种类型
  - `{.callout-note}` - 蓝色信息框
  - `{.callout-warning}` - 黄色警告框
  - `{.callout-tip}` - 绿色提示框
  - `{.callout-important}` - 紫色重要信息框
  - `{.callout-caution}` - 红色警示框
- ✅ **自定义标题**: `{.callout-note title="Custom"}`
- ✅ **通用 Divs**: `::: {.class}`
- ✅ **内联 Spans**: `[text]{.class}`
- ✅ **代码单元选项**: `#| echo: false` (预览时移除)

### 3. 样式支持
- ✅ `src/service/markdown/styles/qmd.css` - PDF 导出样式
- ✅ `resource/vditor/vditor.css` - 编辑器预览样式 (追加)

### 4. 集成修改
- ✅ `src/service/markdown/markdown-pdf.js` - PDF 导出集成
- ✅ `src/provider/markdownEditorProvider.ts` - 编辑器预览集成
- ✅ `package.json` - 文件关联配置 (`.qmd`, `.typ`)

### 5. GitHub Issue
- ✅ 已创建: https://github.com/cweijan/vscode-office/issues/442

### 6. 构建与打包
- ✅ 构建成功 (无错误)
- ✅ VSIX 包已生成: `vscode-office-3.5.5.vsix` (5.56 MB, 886 files)

## 📁 创建的文件
1. `src/service/markdown/qmd-preprocessor.js` - QMD 预处理器 (JS)
2. `src/service/qmdPreprocessor.ts` - QMD 预处理器 (TS)
3. `src/service/markdown/styles/qmd.css` - QMD 样式
4. `test.qmd` - 测试文件

## 🧪 验证步骤

### 编辑器预览
1. 安装 VSIX: `code --install-extension vscode-office-3.5.5.vsix`
2. 在 VS Code 中打开 `test.qmd`
3. 验证 callout 块显示为彩色框
4. 验证自定义标题正确显示

### PDF 导出
1. 在 `test.qmd` 中右键 → "Export To Pdf"
2. 验证导出的 PDF 中 callout 样式正确

## 🎯 实现原理

采用**预处理器模式**:
```
QMD File → Preprocessor → HTML → Vditor/markdown-it → 渲染
```

1. **编辑器**: 在发送给 Vditor 前预处理
2. **导出**: 在 markdown-it 渲染前预处理
3. **双向分离**: 原始内容用于保存，预处理内容用于显示

## 📝 技术细节

- **正则表达式匹配**: 使用多行正则匹配 `:::{.class}...:::`
- **HTML 转换**: callout 块转换为带样式的 `<div>` 结构
- **YAML 保留**: 前言 (front matter) 被保留不处理
- **样式注入**: 通过 CSS 提供视觉样式，支持亮/暗模式

## 🚀 下一步

1. 测试 `test.qmd` 文件的渲染效果
2. 根据需要调整样式
3. 考虑是否添加更多 QMD 特性 (交叉引用等)
