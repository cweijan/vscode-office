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
            enable: false,
            position: "left",
        },
        placeholder: "",
        preview: {
            hljs: Constants.HLJS_OPTIONS,
            markdown: Constants.MARKDOWN_OPTIONS,
            math: Constants.MATH_OPTIONS,
        },
        theme: "classic",
        toolbar: [
            "headings",
            "bold",
            "italic",
            "strike",
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
            "edit-mode",
            {
                name: "more",
                toolbar: [
                    "code-theme",
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
        preventMacOptionKey: true,
        editorTheme: "Auto",
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

        if (mergedOptions.mode === "sv") {
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
            tipPosition: "e",
        }, {
            hotkey: "⌘K",
            icon: getToolbarCodicon("bold"),
            name: "bold",
            prefix: "**",
            suffix: "**",
            tipPosition: "e",
        }, {
            hotkey: "⌘I",
            icon: getToolbarCodicon("italic"),
            name: "italic",
            prefix: "*",
            suffix: "*",
            tipPosition: "e",
        }, {
            hotkey: "⌘D",
            icon: getToolbarCodicon("strike"),
            name: "strike",
            prefix: "~~",
            suffix: "~~",
            tipPosition: "e",
        }, {
            hotkey: "⌘U",
            icon: getToolbarCodicon("link"),
            name: "link",
            prefix: "[",
            suffix: "](https://)",
            tipPosition: "e",
        }, {
            name: "|",
        }, {
            icon: getToolbarCodicon("list"),
            name: "list",
            prefix: "* ",
            tipPosition: "e",
        }, {
            hotkey: "⌘O",
            icon: getToolbarCodicon("ordered-list"),
            name: "ordered-list",
            prefix: "1. ",
            tipPosition: "e",
        }, {
            hotkey: "⌘J",
            icon: getToolbarCodicon("check"),
            name: "check",
            prefix: "* [ ] ",
            tipPosition: "e",
        }, {
            hotkey: "⇧⌘I",
            icon: getToolbarCodicon("outdent"),
            name: "outdent",
            tipPosition: "e",
        }, {
            hotkey: "⇧⌘O",
            icon: getToolbarCodicon("indent"),
            name: "indent",
            tipPosition: "e",
        }, {
            name: "|",
        }, {
            hotkey: "⌘;",
            icon: getToolbarCodicon("quote"),
            name: "quote",
            prefix: "> ",
            tipPosition: "e",
        }, {
            hotkey: "⇧⌘H",
            icon: getToolbarCodicon("line"),
            name: "line",
            prefix: "---",
            tipPosition: "e",
        }, {
            hotkey: "⇧⌘U",
            icon: getToolbarCodicon("code"),
            name: "code",
            prefix: "```",
            suffix: "\n```",
            tipPosition: "e",
        }, {
            hotkey: "⌘G",
            icon: getToolbarCodicon("inline-code"),
            name: "inline-code",
            prefix: "`",
            suffix: "`",
            tipPosition: "e",
        }, {
            hotkey: "⇧⌘B",
            icon: getToolbarCodicon("insert-before"),
            name: "insert-before",
            tipPosition: "e",
        }, {
            hotkey: "⇧⌘E",
            icon: getToolbarCodicon("insert-after"),
            name: "insert-after",
            tipPosition: "e",
        }, {
            name: "|",
        }, {
            icon: getToolbarCodicon("upload"),
            name: "upload",
            tipPosition: "e",
        }, {
            hotkey: "⌘M",
            icon: getToolbarCodicon("table"),
            name: "table",
            prefix: "| col1",
            suffix: " | col2 | col3 |\n| --- | --- | --- |\n|  |  |  |\n|  |  |  |",
            tipPosition: "e",
        }, {
            name: "|",
        }, {
            hotkey: "⌘Z",
            icon: getToolbarCodicon("undo"),
            name: "undo",
            tipPosition: "e",
        }, {
            hotkey: "⌘Y",
            icon: getToolbarCodicon("redo"),
            name: "redo",
            tipPosition: "e",
        }, {
            name: "|",
        }, {
            icon: getToolbarCodicon("more"),
            name: "more",
            tipPosition: "e",
        }, {
            icon: getToolbarCodicon("edit-mode"),
            name: "edit-mode",
            tipPosition: "e",
        }, {
            icon: getToolbarCodicon("outline"),
            name: "outline",
            tipPosition: "e",
        }, {
            name: "editor-theme-label",
            tipPosition: "e",
            icon: "Theme:",
        }, {
            icon: getToolbarCodicon("editor-theme"),
            name: "editor-theme",
            tipPosition: "e",
        }, {
            icon: getToolbarCodicon("code-theme"),
            name: "code-theme",
            tipPosition: "e",
        }, {
            icon: getToolbarCodicon("info"),
            name: "info",
            tipPosition: "e",
        }, {
            icon: getToolbarCodicon("help"),
            name: "help",
            tipPosition: "e",
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
