import { Constants } from "../constants";
import { getToolbarCodicon } from "./codicon";
import { merge } from "./merge";

const toolbarIcon = (name: string, fallback: string) => getToolbarCodicon(name) || fallback;

export class Options {
    public options: IOptions;
    private defaultOptions: IOptions = {
        rtl: false,
        after: undefined,
        cache: {
            enable: false,
        },
        cdn: Constants.CDN,
        classes: {
            preview: "",
        },
        counter: {
            enable: false,
            type: "markdown",
        },
        debugger: false,
        height: "auto",
        hint: {
            delay: 200,
            emoji: {
                "+1": "👍",
                "-1": "👎",
                "confused": "😕",
                "eyes": "👀️",
                "heart": "❤️",
                "rocket": "🚀️",
                "smile": "😄",
                "tada": "🎉️",
            },
            emojiPath: `${Constants.CDN}/dist/images/emoji`,
            extend: [],
            parse: true,
        },
        icon: "ant",
        lang: "zh_CN",
        mode: "ir",
        outline: {
            enable: false,
            position: "left",
        },
        placeholder: "",
        preview: {
            delay: 1000,
            hljs: Constants.HLJS_OPTIONS,
            markdown: Constants.MARKDOWN_OPTIONS,
            math: Constants.MATH_OPTIONS,
            maxWidth: 800,
            theme: Constants.THEME_OPTIONS,
        },
        theme: "classic",
        toolbar: [
            "emoji",
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
                    "content-theme",
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
        undoDelay: 800,
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
            if (this.options.preview?.theme?.list) {
                this.defaultOptions.preview.theme.list = this.options.preview.theme.list;
            }
            if (this.options.hint?.emoji) {
                this.defaultOptions.hint.emoji = this.options.hint.emoji;
            }
            // 支持不够完善，我先注释了，后期再打开
            // if (this.options.rtl) {
            //     this.defaultOptions.rtl = this.options.rtl;
            // }
        }

        const mergedOptions = merge(this.defaultOptions, this.options);

        if (mergedOptions.cache.enable && !mergedOptions.cache.id) {
            throw new Error(
                "need options.cache.id, see https://ld246.com/article/1549638745630#options",
            );
        }

        return mergedOptions;
    }

    private mergeToolbar(toolbar: Array<string | IMenuItem>) {
        const toolbarItem = [{
            hotkey: "⌘E",
            icon: toolbarIcon("emoji", '<svg><use xlink:href="#vditor-icon-emoji"></use></svg>'),
            name: "emoji",
            tipPosition: "e",
        }, {
            hotkey: "⌘H",
            icon: toolbarIcon("headings", '<svg><use xlink:href="#vditor-icon-headings"></use></svg>'),
            name: "headings",
            tipPosition: "e",
        }, {
            hotkey: "⌘K",
            icon: toolbarIcon("bold", '<svg><use xlink:href="#vditor-icon-bold"></use></svg>'),
            name: "bold",
            prefix: "**",
            suffix: "**",
            tipPosition: "e",
        }, {
            hotkey: "⌘I",
            icon: toolbarIcon("italic", '<svg><use xlink:href="#vditor-icon-italic"></use></svg>'),
            name: "italic",
            prefix: "*",
            suffix: "*",
            tipPosition: "e",
        }, {
            hotkey: "⌘D",
            icon: toolbarIcon("strike", '<svg><use xlink:href="#vditor-icon-strike"></use></svg>'),
            name: "strike",
            prefix: "~~",
            suffix: "~~",
            tipPosition: "e",
        }, {
            hotkey: "⌘U",
            icon: toolbarIcon("link", '<svg><use xlink:href="#vditor-icon-link"></use></svg>'),
            name: "link",
            prefix: "[",
            suffix: "](https://)",
            tipPosition: "e",
        }, {
            name: "|",
        }, {
            hotkey: "⌘L",
            icon: toolbarIcon("list", '<svg><use xlink:href="#vditor-icon-list"></use></svg>'),
            name: "list",
            prefix: "* ",
            tipPosition: "e",
        }, {
            hotkey: "⌘O",
            icon: toolbarIcon("ordered-list", '<svg><use xlink:href="#vditor-icon-ordered-list"></use></svg>'),
            name: "ordered-list",
            prefix: "1. ",
            tipPosition: "e",
        }, {
            hotkey: "⌘J",
            icon: toolbarIcon("check", '<svg><use xlink:href="#vditor-icon-check"></use></svg>'),
            name: "check",
            prefix: "* [ ] ",
            tipPosition: "e",
        }, {
            hotkey: "⇧⌘I",
            icon: '<svg><use xlink:href="#vditor-icon-outdent"></use></svg>',
            name: "outdent",
            tipPosition: "e",
        }, {
            hotkey: "⇧⌘O",
            icon: toolbarIcon("indent", '<svg><use xlink:href="#vditor-icon-indent"></use></svg>'),
            name: "indent",
            tipPosition: "e",
        }, {
            name: "|",
        }, {
            hotkey: "⌘;",
            icon: toolbarIcon("quote", '<svg><use xlink:href="#vditor-icon-quote"></use></svg>'),
            name: "quote",
            prefix: "> ",
            tipPosition: "e",
        }, {
            hotkey: "⇧⌘H",
            icon: toolbarIcon("line", '<svg><use xlink:href="#vditor-icon-line"></use></svg>'),
            name: "line",
            prefix: "---",
            tipPosition: "e",
        }, {
            hotkey: "⇧⌘U",
            icon: toolbarIcon("code", '<svg><use xlink:href="#vditor-icon-code"></use></svg>'),
            name: "code",
            prefix: "```",
            suffix: "\n```",
            tipPosition: "e",
        }, {
            hotkey: "⌘G",
            icon: toolbarIcon("inline-code", '<svg><use xlink:href="#vditor-icon-inline-code"></use></svg>'),
            name: "inline-code",
            prefix: "`",
            suffix: "`",
            tipPosition: "e",
        }, {
            hotkey: "⇧⌘B",
            icon: '<svg><use xlink:href="#vditor-icon-before"></use></svg>',
            name: "insert-before",
            tipPosition: "e",
        }, {
            hotkey: "⇧⌘E",
            icon: '<svg><use xlink:href="#vditor-icon-after"></use></svg>',
            name: "insert-after",
            tipPosition: "e",
        }, {
            name: "|",
        }, {
            icon: toolbarIcon("upload", '<svg><use xlink:href="#vditor-icon-upload"></use></svg>'),
            name: "upload",
            tipPosition: "e",
        }, {
            hotkey: "⌘M",
            icon: toolbarIcon("table", '<svg><use xlink:href="#vditor-icon-table"></use></svg>'),
            name: "table",
            prefix: "| col1",
            suffix: " | col2 | col3 |\n| --- | --- | --- |\n|  |  |  |\n|  |  |  |",
            tipPosition: "e",
        }, {
            name: "|",
        }, {
            hotkey: "⌘Z",
            icon: toolbarIcon("undo", '<svg><use xlink:href="#vditor-icon-undo"></use></svg>'),
            name: "undo",
            tipPosition: "e",
        }, {
            hotkey: "⌘Y",
            icon: toolbarIcon("redo", '<svg><use xlink:href="#vditor-icon-redo"></use></svg>'),
            name: "redo",
            tipPosition: "e",
        }, {
            name: "|",
        }, {
            icon: toolbarIcon("more", '<svg><use xlink:href="#vditor-icon-more"></use></svg>'),
            name: "more",
            tipPosition: "e",
        }, {
            icon: toolbarIcon("edit-mode", '<svg><use xlink:href="#vditor-icon-edit"></use></svg>'),
            name: "edit-mode",
            tipPosition: "e",
        }, {
            icon: toolbarIcon("outline", '<svg><use xlink:href="#vditor-icon-align-center"></use></svg>'),
            name: "outline",
            tipPosition: "e",
        }, {
            name: "editor-theme-label",
            tipPosition: "e",
            icon: "Theme:",
        }, {
            icon: toolbarIcon("editor-theme", '<svg><use xlink:href="#vditor-icon-theme"></use></svg>'),
            name: "editor-theme",
            tipPosition: "e",
        }, {
            icon: toolbarIcon("content-theme", '<svg><use xlink:href="#vditor-icon-theme"></use></svg>'),
            name: "content-theme",
            tipPosition: "e",
        }, {
            icon: toolbarIcon("code-theme", '<svg><use xlink:href="#vditor-icon-code-theme"></use></svg>'),
            name: "code-theme",
            tipPosition: "e",
        }, {
            icon: toolbarIcon("info", '<svg><use xlink:href="#vditor-icon-info"></use></svg>'),
            name: "info",
            tipPosition: "e",
        }, {
            icon: toolbarIcon("help", '<svg><use xlink:href="#vditor-icon-help"></use></svg>'),
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
