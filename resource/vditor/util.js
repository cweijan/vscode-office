const latexSymbols = [
    // 运算符
    { name: 'log', value: "\\log" },
    // 关系运算符
    { name: 'pm', value: "\\pm" },
    { name: 'times', value: "\\times" },
    { name: 'leq', value: "\\leq" },
    { name: 'eq', value: "\\eq" },
    { name: 'geq', value: "\\geq" },
    { name: 'neq', value: "\\neq" },
    { name: 'approx', value: "\\approx" },
    { name: 'prod', value: "\\prod" },
    { name: 'bigodot', value: "\\bigodot" },
    // 逻辑符号
    { name: 'exists', value: "\\exists" },
    { name: 'forall', value: "\\forall" },
    { name: 'rightarrow', value: "\\rightarrow" },
    { name: 'leftarrow', value: "\\leftarrow" },
    // 三角函数符号
    { name: 'sin', value: "\\sin" },
    { name: 'cos', value: "\\cos" },
    { name: 'tan', value: "\\tan" },
    // 函数
    { name: 'fraction', value: "\\frac{}{}" },
    { name: 'sqrt', value: "\\sqrt{}" },
    { name: 'sum', value: "\\sum_{i=0}^n" },
    // 希腊数字
    { name: 'alpha', value: "\\alpha" },
    { name: 'beta', value: "\\beta" },
    { name: 'Delta', value: "\\Delta" },
    { name: 'delta', value: "\\delta" },
    { name: 'epsilon', value: "\\epsilon" },
    { name: 'theta', value: "\\theta" },
    { name: 'lambda', value: "\\lambda" },
    { name: 'Lambda', value: "\\Lambda" },
    { name: 'phi', value: "\\phi" },
    { name: 'Phi', value: "\\Phi" },
    { name: 'omega', value: "\\omega" },
    { name: 'Omega', value: "\\Omega" },
];

export const hotKeys = [
    {
        key: '\\',
        hint: (key) => {
            if (document.getSelection()?.anchorNode?.parentElement?.getAttribute('data-type') != "math-inline") {
                return []
            }
            const results = !key ? latexSymbols : latexSymbols.filter((symbol) => symbol.name.toLowerCase().startsWith(key.toLowerCase()));
            return results.map(com => ({
                html: com.name, value: com.value
            }));
        },
    },
]

function loadRes(url) {
    return fetch(url).then(r => r.text())
}

const isMac = navigator.userAgent.includes('Mac OS');
const shortcutTip = isMac ? '⌘ ^ E' : 'Ctrl Alt E';

const THEME_TOGGLE_NAMES = ['Auto', 'Light'];

const SUN_ICON = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 1a4 4 0 1 1 0-8 4 4 0 0 1 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zm8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zm10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0zm-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 1 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708z"/></svg>';

const MOON_ICON = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z"/></svg>';

let themeToggleBtn;

export function initThemeToggle(currentTheme) {
    if (themeToggleBtn) {
        updateThemeToggle(currentTheme);
        return;
    }
    themeToggleBtn = document.createElement('button');
    themeToggleBtn.type = 'button';
    themeToggleBtn.className = 'vditor-theme-toggle';
    themeToggleBtn.addEventListener('click', () => {
        const theme = themeToggleBtn.dataset.theme;
        const nextTheme = theme === 'Light' ? 'Auto' : 'Light';
        handler.emit('theme', { label: nextTheme });
    });
    document.body.appendChild(themeToggleBtn);
    updateThemeToggle(currentTheme);
}

export function updateThemeToggle(theme) {
    if (!themeToggleBtn) return;
    if (!THEME_TOGGLE_NAMES.includes(theme)) {
        themeToggleBtn.hidden = true;
        return;
    }
    themeToggleBtn.hidden = false;
    themeToggleBtn.dataset.theme = theme;
    const isLight = theme === 'Light';
    themeToggleBtn.innerHTML = isLight ? MOON_ICON : SUN_ICON;
    themeToggleBtn.title = isLight ? '切换为跟随 VS Code 主题 (Auto)' : '切换为亮色主题 (Light)';
    themeToggleBtn.setAttribute('aria-label', themeToggleBtn.title);
}

export async function getToolbar(resPath) {
    return [
        'outline',
        "headings",
        "bold",
        "italic",
        "strike",
        "link",
        "|",
        {
            tipPosition: 's',
            tip: `Edit In VSCode (${shortcutTip})`,
            className: 'right',
            icon: await loadRes(`${resPath}/icon/vscode.svg`),
            click() {
                handler.emit("editInVSCode", true)
            }
        },
        {
            tipPosition: 's',
            tip: 'Export To Pdf',
            className: 'right',
            icon: await loadRes(`${resPath}/icon/pdf.svg`),
            click() {
                handler.emit("export")
            }
        },
        { name: 'upload', tipPosition: 'e' },
        "|",
        {
            name: 'selectTheme',
            tipPosition: 's', tip: 'Select Theme',
            icon: 'Theme:',
            click() {
                handler.emit("theme")
            }
        },
        {
            tipPosition: 's', tip: 'Select Theme',
            icon: await loadRes(`${resPath}/icon/theme.svg`),
            click() {
                handler.emit("theme")
            }
        },
        "|",
        // "edit-mode",  // 屏蔽掉, 现版本都是针对一种模式优化
        "code-theme",
        // "|",
        "list",
        "ordered-list",
        "check",
        "table",
        "|",
        "quote",
        "line",
        "code",
        "inline-code",
        "|",
        "undo",
        "redo",
        "|",
        "edit-mode",
        "preview",
        "help",
    ]
}

/**
 * 针对wysiwyg和ir两种模式对超链接做不同的处理
 */
export const openLink = () => {
    const clickCallback = e => {
        let ele = e.target;
        e.stopPropagation()
        const isSpecial = ['dblclick', 'auxclick'].includes(e.type)
        if (!isCompose(e) && !isSpecial) {
            return;
        }
        if (ele.tagName == 'A') {
            handler.emit("openLink", ele.href)
        } else if (ele.tagName == 'IMG') {
            const parent = ele.parentElement;
            if (parent?.tagName == 'A' && parent.href) {
                handler.emit("openLink", parent.href)
                return;
            }
            const src = ele.src;
            if (src?.match(/http/)) {
                handler.emit("openLink", src)
            }
        }
    }
    const content = document.querySelector(".vditor-wysiwyg");
    content.addEventListener('dblclick', clickCallback);
    content.addEventListener('click', clickCallback);
    content.addEventListener('auxclick', clickCallback);
    document.querySelector(".vditor-reset").addEventListener("scroll", e => {
        // 滚动有偏差
        handler.emit("scroll", { scrollTop: e.target.scrollTop - 70 })
    });
    document.querySelector(".vditor-ir").addEventListener('click', e => {
        let ele = e.target;
        if (ele.classList.contains('vditor-ir__link')) {
            ele = e.target.nextElementSibling?.nextElementSibling?.nextElementSibling
        }
        if (ele.classList.contains('vditor-ir__marker--link')) {
            handler.emit("openLink", ele.textContent)
        }
    });
}

export function scrollEditor(top) {
    const scrollHack = setInterval(() => {
        const editorContainer = document.querySelector(".vditor-reset");
        if (!editorContainer) return;
        editorContainer.scrollTo({ top })
        clearInterval(scrollHack)
    }, 10);
}


//监听选项改变事件
export function onToolbarClick(editor) {
    document.querySelector('.vditor-toolbar').addEventListener("click", (e) => {
        let target = e.target, type;
        for (let i = 0; i < 3; i++) {
            if (type = target.dataset.type) break;
            target = target.parentElement;
        }
        if (type == 'outline') {
            handler.emit("saveOutline", editor.vditor.options.outline.enable)
        }
    })
}

const hideContextMenu = (menu) => {
    menu.hidden = true
}

const showContextMenu = (menu, clientX, clientY) => {
    menu.hidden = false
    menu.style.left = `${clientX}px`
    menu.style.top = `${clientY}px`
    const rect = menu.getBoundingClientRect()
    const padding = 4
    let left = clientX
    let top = clientY
    if (left + rect.width > window.innerWidth - padding) {
        left = window.innerWidth - rect.width - padding
    }
    if (top + rect.height > window.innerHeight - padding) {
        top = window.innerHeight - rect.height - padding
    }
    if (left < padding) left = padding
    if (top < padding) top = padding
    menu.style.left = `${left}px`
    menu.style.top = `${top}px`
}

export const createContextMenu = (editor) => {
    const menu = document.getElementById('context-menu')

    const closeMenu = () => hideContextMenu(menu)

    document.addEventListener('mousedown', e => {
        if (!menu.contains(e.target)) {
            closeMenu()
        }
    })
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            closeMenu()
        }
    })
    document.oncontextmenu = e => {
        e.preventDefault()
        e.stopPropagation()
        showContextMenu(menu, e.clientX, e.clientY)
    }
    menu.addEventListener('click', e => {
        const item = e.target.closest('[data-action]')
        if (!item) return
        closeMenu()
        const action = item.dataset.action
        switch (action) {
            case 'copy':
                document.execCommand('copy')
                break
            case 'paste':
                if (document.getSelection()?.toString()) { document.execCommand('delete') }
                vscodeEvent.emit('command', 'office.markdown.paste')
                break
            case 'exportPdf':
                vscodeEvent.emit('export', { type: 'pdf' })
                break
            case 'exportPdfWithoutOutline':
                vscodeEvent.emit('export', { type: 'pdf', withoutOutline: true })
                break
            case 'exportDocx':
                vscodeEvent.emit('export', { type: 'docx' })
                break
            case 'exportHtml':
                vscodeEvent.emit('export', { type: 'html' })
                break
        }
    })
}

export const imageParser = (viewAbsoluteLocal) => {
    if (!viewAbsoluteLocal) return;
    var observer = new MutationObserver(mutationList => {
        for (var mutation of mutationList) {
            for (var node of mutation.addedNodes) {
                if (!node.querySelector) continue;
                const imgs = node.querySelectorAll('img')
                for (const img of imgs) {
                    const url = img.src;
                    if (url.startsWith("http")) { continue; }
                    if (url.startsWith("vscode-webview-resource") || url.includes("file:///")) {
                        img.src = `https://file+.vscode-resource.vscode-cdn.net/${url.split("file:///")[1]}`
                    }
                }
            }
        }
    });
    observer.observe(document, {
        childList: true,
        subtree: true
    });
}

function matchShortcut(hotkey, event) {

    const matchAlt = hotkey.match(/!/) != null == event.altKey
    const matchMeta = hotkey.match(/⌘/) != null == event.metaKey
    const matchCtrl = hotkey.match(/\^/) != null == event.ctrlKey
    const matchShifter = hotkey.match(/\+/) != null == event.shiftKey

    if (matchAlt && matchCtrl && matchShifter && matchMeta) {
        return hotkey.match(new RegExp(`\\b${event.key}\\b`, "i"))
    }

}


/**
 * 自动补全符号
 */
const isInsideCodeMirrorTarget = (target) => {
    const node = target?.nodeType === 1 ? target : target?.parentElement;
    return !!node?.closest?.(".vditor-code-block--cm .cm-editor");
};
// const keys = ['"', "{", "("];
const keyCodes = [222, 219, 57];
export const autoSymbol = (handler, editor, config) => {
    let _exec = document.execCommand.bind(document)
    document.execCommand = (cmd, ...args) => {
        if (cmd === 'delete') {
            setTimeout(() => {
                return _exec(cmd, ...args)
            })
        } else {
            return _exec(cmd, ...args)
        }
    }
    window.addEventListener('keydown', async e => {
        if (matchShortcut('^⌘e', e) || matchShortcut('^!e', e)) {
            e.stopPropagation();
            e.preventDefault();
            return handler.emit("editInVSCode", true);
        }

        if (e.code == 'F12') return handler.emit('developerTool')
        if (isCompose(e)) {
            switch (e.code) {
                case 'KeyS':
                    vscodeEvent.emit("doSave", editor.getValue());
                    e.stopPropagation();
                    e.preventDefault();
                    break;
                case 'KeyV':
                    if (isInsideCodeMirrorTarget(e.target) || isInsideCodeMirrorTarget(document.activeElement)) {
                        return;
                    }
                    if (e.shiftKey) {
                        const text = await navigator.clipboard.readText();
                        if (text) document.execCommand('insertText', false, text.trim());
                        e.stopPropagation();
                    }
                    else if (document.getSelection()?.toString()) {
                        // 修复剪切后选中文本没有被清除
                        document.execCommand("delete")
                    }
                    e.preventDefault();
                    break;
            }
        }
        if (!keyCodes.includes(e.keyCode)) return;
        const selectText = document.getSelection().toString();
        if (selectText != "") { return; }
        if (e.key == '(') {
            document.execCommand('insertText', false, ')');
            document.getSelection().modify('move', 'left', 'character')
        } else if (e.key == '{') {
            document.execCommand('insertText', false, '}');
            document.getSelection().modify('move', 'left', 'character')
        } else if (e.key == '"') {
            document.execCommand('insertText', false, e.key);
            document.getSelection().modify('move', 'left', 'character')
        }
    }, isMac ? true : undefined)

    window.onresize = () => {
        document.getElementById('vditor').style.height = '100%'
    }
    let app;
    let needFocus = false;
    window.onblur = () => {
        if (!app) { app = document.querySelector('.vditor-reset'); }
        // 纯文本没有offsetTop, 所以需要拿父节点
        const targetNode = document.getSelection()?.baseNode?.parentNode;
        // 如果编辑器现在没有获得焦点, 则无需重获焦点
        if (!app?.contains(targetNode)) {
            needFocus = false;
            return;
        }
        // 判断是否需要聚焦
        const curPosition = targetNode?.offsetTop ?? 0;
        const appPosition = app?.scrollTop ?? 0;
        if (appPosition - curPosition < window.innerHeight) {
            needFocus = true;
        }
    }
    window.onfocus = () => {
        if (!app) { app = document.querySelector('.vditor-reset'); }
        if (needFocus) {
            app.focus()
            needFocus = false;
        }
    }
}