import { Constants } from "../constants";
import { getToolbarCodicon } from "./codicon";
import { merge } from "./merge";

export class Options {
    public options: IOptions;
    private defaultOptions: IOptions = {
        rtl: false,
        after: undefined,
        cache: {
            enable: false,
            focusHost: "browser",
        },
        cdn: Constants.CDN,
        counter: {
            enable: false,
            type: "markdown",
        },
        debugger: false,
        height: "auto",
        hint: {
            delay: 200,
            extend: [],
            parse: true,
        },
        lang: "zh_CN",
        mode: "ir",
        outline: {
            enable: true,
            position: "left",
        },
        placeholder: "",
        preview: {
            markdown: Constants.MARKDOWN_OPTIONS,
            math: Constants.MATH_OPTIONS,
        },
        theme: "classic",
        toolbar: [
            "headings",
            "bold",
            "italic",
            "strike",
            "font-color",
            "link",
            "|",
            "list",
            "ordered-list",
            "check",
            "outdent",
            "indent",
            "|",
            "quote",
            "line",
            "code",
            "inline-code",
            "insert-before",
            "insert-after",
            "|",
            "upload",
            "table",
            "|",
            "undo",
            "redo",
            "|",
            "settings",
            {
                name: "more",
                toolbar: [
                    "outline",
                    "info",
                    "help",
                ],
            },
        ],
        toolbarConfig: {
            hide: false,
            pin: false,
        },
        undoDelay: 600,
        upload: {
            extraData: {},
            fieldName: "file[]",
            filename: (name: string) => name.replace(/\W/g, ""),
            linkToImgUrl: "",
            max: 10 * 1024 * 1024,
            multiple: true,
            url: "",
            withCredentials: false,
        },
        value: "",
        width: "auto",
        editorTheme: "Auto",
        lastNonAutoEditorTheme: "Light",
        mermaidTheme: "Auto",
        onSponsorLogoClick: undefined,
        onSponsorSiteClick: undefined,
    };

    constructor(options: IOptions) {
        this.options = options;
    }

    public merge(): IOptions {
        if (this.options) {
            if (this.options.toolbar) {
                this.options.toolbar = this.mergeToolbar(this.options.toolbar);
            } else {
                this.options.toolbar = this.mergeToolbar(this.defaultOptions.toolbar);
            }
            // 支持不够完善，我先注释了，后期再打开
            // if (this.options.rtl) {
            //     this.defaultOptions.rtl = this.options.rtl;
            // }
        }

        const mergedOptions = merge(this.defaultOptions, this.options);

        // 兼容旧配置传入的 sv（分割视图），映射为 ir
        if ((mergedOptions.mode as string) === "sv") {
            mergedOptions.mode = "ir";
        }

        if (mergedOptions.cache.enable && !mergedOptions.cache.id) {
            throw new Error(
                "need options.cache.id, see https://ld246.com/article/1549638745630#options",
            );
        }

        return mergedOptions;
    }

    private mergeToolbar(toolbar: Array<string | IMenuItem>) {
        const toolbarItem = [{
            hotkey: "⌘H",
            icon: getToolbarCodicon("headings"),
            name: "headings",
        }, {
            hotkey: "⌘K",
            icon: getToolbarCodicon("bold"),
            name: "bold",
            prefix: "**",
            suffix: "**",
        }, {
            hotkey: "⌘I",
            icon: getToolbarCodicon("italic"),
            name: "italic",
            prefix: "*",
            suffix: "*",
        }, {
            hotkey: "⌘D",
            icon: getToolbarCodicon("strike"),
            name: "strike",
            prefix: "~~",
            suffix: "~~",
        }, {
            icon: getToolbarCodicon("font-color"),
            name: "font-color",
        }, {
            hotkey: "⌘U",
            icon: getToolbarCodicon("link"),
            name: "link",
            prefix: "[",
            suffix: "](https://)",
        }, {
            name: "|",
        }, {
            icon: getToolbarCodicon("list"),
            name: "list",
            prefix: "* ",
        }, {
            hotkey: "⌘O",
            icon: getToolbarCodicon("ordered-list"),
            name: "ordered-list",
            prefix: "1. ",
        }, {
            hotkey: "⌘J",
            icon: getToolbarCodicon("check"),
            name: "check",
            prefix: "* [ ] ",
        }, {
            hotkey: "⇧⌘I",
            icon: getToolbarCodicon("outdent"),
            name: "outdent",
        }, {
            hotkey: "⇧⌘O",
            icon: getToolbarCodicon("indent"),
            name: "indent",
        }, {
            name: "|",
        }, {
            hotkey: "⌘;",
            icon: getToolbarCodicon("quote"),
            name: "quote",
            prefix: "> ",
        }, {
            hotkey: "⇧⌘H",
            icon: getToolbarCodicon("line"),
            name: "line",
            prefix: "---",
        }, {
            hotkey: "⇧⌘U",
            icon: getToolbarCodicon("code"),
            name: "code",
            prefix: "```",
            suffix: "\n```",
        }, {
            hotkey: "⌘G",
            icon: getToolbarCodicon("inline-code"),
            name: "inline-code",
            prefix: "`",
            suffix: "`",
        }, {
            hotkey: "⇧⌘B",
            icon: getToolbarCodicon("insert-before"),
            name: "insert-before",
        }, {
            hotkey: "⇧⌘E",
            icon: getToolbarCodicon("insert-after"),
            name: "insert-after",
        }, {
            name: "|",
        }, {
            icon: getToolbarCodicon("upload"),
            name: "upload",
        }, {
            hotkey: "⌘M",
            icon: getToolbarCodicon("table"),
            name: "table",
            prefix: "| col1",
            suffix: " | col2 | col3 |\n| --- | --- | --- |\n|  |  |  |\n|  |  |  |",
        }, {
            name: "|",
        }, {
            hotkey: "⌘Z",
            icon: getToolbarCodicon("undo"),
            name: "undo",
        }, {
            hotkey: "⌘Y",
            icon: getToolbarCodicon("redo"),
            name: "redo",
        }, {
            name: "|",
        }, {
            icon: getToolbarCodicon("more"),
            name: "more",
        }, {
            icon: getToolbarCodicon("find"),
            name: "find",
        }, {
            icon: getToolbarCodicon("edit-mode"),
            name: "edit-mode",
        }, {
            icon: getToolbarCodicon("settings"),
            name: "settings",
            tip: "Settings",
        }, {
            icon: getToolbarCodicon("outline"),
            name: "outline",
        }, {
            name: "editor-theme-label",
            icon: "Theme:",
        }, {
            icon: getToolbarCodicon("editor-theme"),
            name: "editor-theme",
        }, {
            icon: "",
            name: "editor-theme-toggle",
        }, {
            icon: getToolbarCodicon("code-theme"),
            name: "code-theme",
        }, {
            icon: getToolbarCodicon("info"),
            name: "info",
        }, {
            icon: getToolbarCodicon("help"),
            name: "help",
        }, {
            icon: getToolbarCodicon("ai-settings"),
            name: "ai-settings",
        }, {
            name: "br",
        }];
        const toolbarResult: IMenuItem[] = [];
        toolbar.forEach((menuItem: IMenuItem) => {
            let currentMenuItem = menuItem;
            toolbarItem.forEach((defaultMenuItem: IMenuItem) => {
                if (
                    typeof menuItem === "string" &&
                    defaultMenuItem.name === menuItem
                ) {
                    currentMenuItem = defaultMenuItem;
                }
                if (
                    typeof menuItem === "object" &&
                    defaultMenuItem.name === menuItem.name
                ) {
                    currentMenuItem = Object.assign({}, defaultMenuItem, menuItem);
                }
            });
            if (menuItem.toolbar) {
                currentMenuItem.toolbar = this.mergeToolbar(menuItem.toolbar);
            }
            toolbarResult.push(currentMenuItem);
        });
        return toolbarResult;
    }
}
