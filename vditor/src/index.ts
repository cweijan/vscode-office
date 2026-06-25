import "./assets/less/index.less";
import * as adapterRender from "./ts/markdown/adapterRender";
import {codeRender} from "./ts/markdown/codeRender";
import {codeMirrorPreviewRender} from "./ts/codeBlock/codeMirrorPreviewRender";
import {mathRender} from "./ts/markdown/mathRender";
import {mermaidRender} from "./ts/markdown/mermaidRender";
import {outlineRender} from "./ts/markdown/outlineRender";
import {plantumlRender} from "./ts/markdown/plantumlRender";
import {previewImage} from "./ts/preview/image";
import {Constants, VDITOR_VERSION} from "./ts/constants";
import {Hint} from "./ts/hint/index";
import {IR} from "./ts/ir/index";
import {input as irInput} from "./ts/ir/input";
import {processAfterRender} from "./ts/ir/process";
import {getHTML} from "./ts/markdown/getHTML";
import {getMarkdown} from "./ts/markdown/getMarkdown";
import {setLute} from "./ts/markdown/setLute";
import {Outline} from "./ts/outline/index";
import {Tip} from "./ts/tip/index";
import {Toolbar} from "./ts/toolbar/index";
import {disableToolbar, hidePanel} from "./ts/toolbar/setToolbar";
import {enableToolbar} from "./ts/toolbar/setToolbar";
import {AIDialog} from "./ts/ui/aiDialog";
import {initUI} from "./ts/ui/initUI";
import {setCodeTheme} from "./ts/ui/setCodeTheme";
import {setEditorTheme as applyEditorTheme} from "./ts/ui/setEditorTheme";
import {setTheme} from "./ts/ui/setTheme";
import {Undo} from "./ts/undo/index";
import {Upload} from "./ts/upload/index";
import {addScript} from "./ts/util/addScript";
import {clearCacheFocus, restoreCacheFocus} from "./ts/util/cacheFocus";
import {accessLocalStorage} from "./ts/util/compatibility";
import {clearDocumentScroll, restoreDocumentScroll} from "./ts/util/documentState";
import {getSelectText} from "./ts/util/getSelectText";
import {Options} from "./ts/util/Options";
import {processCodeRender} from "./ts/util/processCode";
import {getCursorPosition, getEditorRange} from "./ts/util/selection";
import {
    captureEditorSelection,
    hideFrozenSelection,
    restoreEditorSelection,
    showFrozenSelection,
} from "./ts/util/frozenSelection";
import {afterRenderEvent} from "./ts/wysiwyg/afterRenderEvent";
import {renderToc} from "./ts/util/toc";
import {scrollToBlock as scrollToBlockUtil} from "./ts/util/scrollToBlock";
import {WYSIWYG} from "./ts/wysiwyg/index";
import {input} from "./ts/wysiwyg/input";
import {renderDomByMd} from "./ts/wysiwyg/renderDomByMd";

class Vditor {
    public static adapterRender = adapterRender;
    public static previewImage = previewImage;
    public static codeRender = codeRender;
    public static codeMirrorPreviewRender = codeMirrorPreviewRender;
    public static mathRender = mathRender;
    public static mermaidRender = mermaidRender;
    public static plantumlRender = plantumlRender;
    public static outlineRender = outlineRender;
    public static setCodeTheme = setCodeTheme;
    public static setEditorTheme = applyEditorTheme;

    public readonly version: string;
    public vditor: IVditor;
    private aiDialog: AIDialog | null = null;
    private aiSelectionRange: Range | null = null;

    /**
     * @param id 要挂载 Vditor 的元素或者元素 ID。
     * @param options Vditor 参数
     */
    constructor(id: string | HTMLElement, options?: IOptions) {
        this.version = VDITOR_VERSION;

        if (typeof id === "string") {
            if (!options) {
                options = {
                    cache: {
                        id: `vditor${id}`,
                    },
                };
            } else if (!options.cache) {
                options.cache = {id: `vditor${id}`};
            } else if (!options.cache.id) {
                options.cache.id = `vditor${id}`;
            }
            id = document.getElementById(id);
        }

        const getOptions = new Options(options);
        const mergedOptions = getOptions.merge();

        // 支持自定义国际化
        if (!mergedOptions.i18n) {
            if (!["en_US", "ja_JP", "ko_KR", "ru_RU", "zh_CN", "zh_TW"].includes(mergedOptions.lang)) {
                throw new Error(
                    "options.lang error, see https://ld246.com/article/1549638745630#options",
                );
            } else {
                const i18nScriptPrefix = "vditorI18nScript";
                const i18nScriptID = i18nScriptPrefix + mergedOptions.lang;
                document.querySelectorAll(`head script[id^="${i18nScriptPrefix}"]`).forEach((el) => {
                    if (el.id !== i18nScriptID) {
                        document.head.removeChild(el);
                    }
                });
                addScript(`${mergedOptions.cdn}/dist/js/i18n/${mergedOptions.lang}.js`, i18nScriptID).then(() => {
                    this.init(id as HTMLElement, mergedOptions);
                });
            }
        } else {
            window.VditorI18n = mergedOptions.i18n;
            this.init(id, mergedOptions);
        }
    }

    /** 设置主题 */
    public setTheme(
        theme: "dark" | "classic",
        codeTheme?: string,
    ) {
        this.vditor.options.theme = theme;
        setTheme(this.vditor);
        if (codeTheme) {
            this.vditor.options.codeMirrorTheme = codeTheme;
            setCodeTheme(codeTheme, this.vditor.element);
        }
    }

    /** 设置 Markdown 编辑器主题（bundled in index.css） */
    public setEditorTheme(editorTheme: string) {
        applyEditorTheme(this.vditor, editorTheme, false);
    }

    /** 获取 Markdown 内容 */
    public getValue() {
        return getMarkdown(this.vditor);
    }

    /** 获取编辑器当前编辑模式 */
    public getCurrentMode() {
        return this.vditor.currentMode;
    }

    /** 聚焦到编辑器 */
    public focus() {
        if (this.vditor.currentMode === "wysiwyg") {
            this.vditor.wysiwyg.element.focus();
        } else if (this.vditor.currentMode === "ir") {
            this.vditor.ir.element.focus();
        }
    }

    /** 让编辑器失焦 */
    public blur() {
        if (this.vditor.currentMode === "wysiwyg") {
            this.vditor.wysiwyg.element.blur();
        } else if (this.vditor.currentMode === "ir") {
            this.vditor.ir.element.blur();
        }
    }

    /** 禁用编辑器 */
    public disabled() {
        hidePanel(this.vditor, ["subToolbar", "hint", "popover"]);
        disableToolbar(
            this.vditor.toolbar.elements,
            Constants.EDIT_TOOLBARS.concat(["undo", "redo", "edit-mode"]),
        );
        this.vditor[this.vditor.currentMode].element.setAttribute(
            "contenteditable",
            "false",
        );
    }

    /** 解除编辑器禁用 */
    public enable() {
        enableToolbar(
            this.vditor.toolbar.elements,
            Constants.EDIT_TOOLBARS.concat(["undo", "redo", "edit-mode"]),
        );
        this.vditor.undo.resetIcon(this.vditor);
        this.vditor[this.vditor.currentMode].element.setAttribute("contenteditable", "true");
    }

    /** 返回选中的字符串 */
    public getSelection() {
        if (this.vditor.currentMode === "wysiwyg") {
            return getSelectText(this.vditor.wysiwyg.element);
        }
        if (this.vditor.currentMode === "ir") {
            return getSelectText(this.vditor.ir.element);
        }
    }

    /** 获取焦点位置 */
    public getCursorPosition() {
        return getCursorPosition(this.vditor[this.vditor.currentMode].element);
    }

    /** 恢复上次焦点位置；onLoad 用于页面首次加载 */
    public restoreFocus(onLoad = false) {
        restoreCacheFocus(this.vditor, { onLoad });
    }

    /** 恢复文档滚动位置 */
    public restoreScroll(scrollTop?: number) {
        restoreDocumentScroll(this.vditor, scrollTop);
    }

    /** 恢复滚动与焦点；onLoad 用于页面首次加载 */
    public restoreDocumentSession(onLoad = false) {
        restoreCacheFocus(this.vditor, { onLoad });
    }

    /** 滚动到块引用或标题 fragment（如 ^block-id 或标题 slug） */
    public scrollToBlock(fragment: string) {
        return scrollToBlockUtil(this.vditor, fragment);
    }

    /** 上传是否还在进行中 */
    public isUploading() {
        return this.vditor.upload.isUploading;
    }

    /** 清除缓存 */
    public clearCache() {
        if (accessLocalStorage()) {
            const cacheId = this.vditor.options.cache.id;
            if (cacheId) {
                localStorage.removeItem(cacheId);
                clearCacheFocus(cacheId);
                clearDocumentScroll(cacheId);
            }
        }
    }

    /** 禁用缓存 */
    public disabledCache() {
        this.vditor.options.cache.enable = false;
    }

    /** 启用缓存 */
    public enableCache() {
        if (!this.vditor.options.cache.id) {
            throw new Error(
                "need options.cache.id, see https://ld246.com/article/1549638745630#options",
            );
        }
        this.vditor.options.cache.enable = true;
    }

    /** HTML 转 md */
    public html2md(value: string) {
        return this.vditor.lute.HTML2Md(value);
    }

    /** markdown 转 JSON 输出 */
    public exportJSON(value: string) {
        return this.vditor.lute.RenderJSON(value);
    }

    /** 获取 HTML */
    public getHTML() {
        return getHTML(this.vditor);
    }

    /** 消息提示。time 为 0 将一直显示 */
    public tip(text: string, time?: number) {
        this.vditor.tip.show(text, time);
    }

    /** 删除选中内容 */
    public deleteValue() {
        if (window.getSelection().isCollapsed) {
            return;
        }
        document.execCommand("delete", false);
    }

    /** 更新选中内容 */
    public updateValue(value: string) {
        document.execCommand("insertHTML", false, value);
    }

    /** 在焦点处插入内容，并默认进行 Markdown 渲染 */
    public insertValue(value: string, render = true) {
        const range = getEditorRange(this.vditor);
        range.collapse(true);
        const tmpElement = document.createElement("template");
        tmpElement.innerHTML = value;
        range.insertNode(tmpElement.content.cloneNode(true));
        if (this.vditor.currentMode === "wysiwyg") {
            this.vditor.wysiwyg.preventInput = true;
            if (render) {
                input(this.vditor, getSelection().getRangeAt(0));
            }
        } else if (this.vditor.currentMode === "ir") {
            this.vditor.ir.preventInput = true;
            if (render) {
                irInput(this.vditor, getSelection().getRangeAt(0), true);
            }
        }
    }

    /** 设置编辑器内容 */
    public setValue(markdown: string, clearStack = false) {
        if (this.vditor.currentMode === "wysiwyg") {
            renderDomByMd(this.vditor, markdown, {
                enableAddUndoStack: true,
                enableHint: false,
                enableInput: false,
            });
        } else {
            this.vditor.ir.element.innerHTML = this.vditor.lute.Md2VditorIRDOM(markdown);
            this.vditor.ir.element
                .querySelectorAll(".vditor-ir__preview[data-render='2']")
                .forEach((item: HTMLElement) => {
                    processCodeRender(item, this.vditor);
                });
            processAfterRender(this.vditor, {
                enableAddUndoStack: true,
                enableHint: false,
                enableInput: false,
            });
        }

        renderToc(this.vditor);

        if (!markdown) {
            hidePanel(this.vditor, ["headings", "submenu", "hint"]);
            if (this.vditor.wysiwyg.popover) {
                this.vditor.wysiwyg.popover.style.display = "none";
            }
            this.clearCache();
        }
        if (clearStack) {
            this.clearStack();
        }
    }

    /** 清空 undo & redo 栈 */
    public clearStack() {
        this.vditor.undo.clearStack(this.vditor);
        this.vditor.undo.addToUndoStack(this.vditor);
    }

    /** 设置 Github Copilot（VS Code Language Model API）是否可选 */
    public setCopilotAvailable(available: boolean) {
        this.aiDialog?.setCopilotAvailable(available);
    }

    /** 打开 AI 润色弹窗，由外部（右键菜单等）调用 */
    public openAIPolishDialog() {
        if (!this.aiDialog) { return; }
        const sel = this.getSelection();
        this.aiSelectionRange = captureEditorSelection(this.vditor);
        if (this.aiSelectionRange) {
            showFrozenSelection(this.vditor, this.aiSelectionRange);
        }
        this.aiDialog.open(sel || this.getValue(), !!sel);
    }

    /** 触发 AI 润色。capturedMarkdown/isSelection 由调用方在失焦前预先捕获，避免选区丢失 */
    public triggerAIPolish(options?: IAIPolishOptions, capturedMarkdown?: string, isSelection?: boolean) {
        const onPolish = this.vditor.options.ai?.onPolish;
        if (!onPolish) {
            return;
        }
        const replaceAll = isSelection !== undefined ? !isSelection : !this.getSelection();
        const markdown = capturedMarkdown ?? (this.getSelection() || this.getValue());
        this.disabled();
        this._showAILoadingOverlay();
        onPolish(markdown, (result: string) => {
            this.applyAIResult(result, replaceAll);
        }, options);
    }

    /** 接收 AI 润色结果：退出 loading 状态，将 markdown 并入正文 */
    public applyAIResult(markdown: string, replaceAll = false) {
        this._hideAILoadingOverlay();
        this.enable();
        hideFrozenSelection(this.vditor);
        if (replaceAll) {
            this.aiSelectionRange = null;
            this.setValue(markdown);
        } else {
            restoreEditorSelection(this.vditor, this.aiSelectionRange);
            this.aiSelectionRange = null;
            document.execCommand("delete", false);
            const html = this.vditor.lute.Md2HTML(markdown);
            document.execCommand("insertHTML", false, html);
        }
    }

    private _showAILoadingOverlay() {
        let overlay = this.vditor.element.querySelector(".vditor-ai-overlay") as HTMLElement | null;
        if (!overlay) {
            overlay = document.createElement("div");
            overlay.className = "vditor-ai-overlay";
            const cancelLabel = window.VditorI18n?.aiCancel || "Cancel";
            overlay.innerHTML = `<div class="vditor-ai-overlay__spinner"></div>
                <button class="vditor-ai-overlay__cancel" type="button">${cancelLabel}</button>`;
            overlay.querySelector(".vditor-ai-overlay__cancel")!.addEventListener("click", () => {
                this._hideAILoadingOverlay();
                this.enable();
                this.vditor.options.ai?.onCancelPolish?.();
            });
            this.vditor.element.appendChild(overlay);
        }
        overlay.hidden = false;
    }

    private _hideAILoadingOverlay() {
        const overlay = this.vditor.element.querySelector(".vditor-ai-overlay") as HTMLElement | null;
        if (overlay) overlay.hidden = true;
    }

    /** 销毁编辑器 */
    public destroy() {
        this.vditor.element.innerHTML = this.vditor.originalInnerHTML;
        this.vditor.element.classList.remove("vditor");
        this.vditor.element.removeAttribute("style");
        this.clearCache();

        this.vditor.wysiwyg.unbindListener();
    }

    private init(id: HTMLElement, mergedOptions: IOptions) {
        this.vditor = {
            currentMode: mergedOptions.mode,
            element: id,
            hint: new Hint(mergedOptions.hint.extend),
            lute: undefined,
            options: mergedOptions,
            originalInnerHTML: id.innerHTML,
            outline: new Outline(window.VditorI18n.outline),
            tip: new Tip(),
        };

        this.vditor.undo = new Undo();
        this.vditor.wysiwyg = new WYSIWYG(this.vditor);
        this.vditor.ir = new IR(this.vditor);
        this.vditor.toolbar = new Toolbar(this.vditor);

        if (mergedOptions.upload.url || mergedOptions.upload.handler) {
            this.vditor.upload = new Upload();
        }

        addScript(
            mergedOptions._lutePath ||
            `${mergedOptions.cdn}/dist/js/lute/lute.min.js`,
            "vditorLuteScript",
        ).then(() => {
            this.vditor.lute = setLute({
                autoSpace: this.vditor.options.preview.markdown.autoSpace,
                codeBlockPreview: this.vditor.options.preview.markdown
                    .codeBlockPreview,
                fixTermTypo: this.vditor.options.preview.markdown.fixTermTypo,
                footnotes: this.vditor.options.preview.markdown.footnotes,
                headingAnchor: false,
                inlineMathDigit: this.vditor.options.preview.math.inlineDigit,
                linkBase: this.vditor.options.preview.markdown.linkBase,
                linkPrefix: this.vditor.options.preview.markdown.linkPrefix,
                listStyle: this.vditor.options.preview.markdown.listStyle,
                mark: this.vditor.options.preview.markdown.mark,
                obsidian: this.vditor.options.preview.markdown.obsidian,
                mathBlockPreview: this.vditor.options.preview.markdown
                    .mathBlockPreview,
                paragraphBeginningSpace: this.vditor.options.preview.markdown
                    .paragraphBeginningSpace,
                sanitize: this.vditor.options.preview.markdown.sanitize,
                toc: this.vditor.options.preview.markdown.toc,
            });

            initUI(this.vditor);

            if (mergedOptions.ai?.onPolish) {
                this.aiDialog = new AIDialog(this.vditor.element, (markdown, isSelection, options) => {
                    this.triggerAIPolish(options, markdown, isSelection);
                }, (reason) => {
                    hideFrozenSelection(this.vditor);
                    if (reason !== "submit") {
                        this.aiSelectionRange = null;
                    }
                });
            }

            if (mergedOptions.after) {
                mergedOptions.after();
            }
        });
    }
}

export default Vditor;
