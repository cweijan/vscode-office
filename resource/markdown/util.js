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

const SPONSOR_URL = 'https://database-client.com/';

function bindOfficeHelpTip(tipRoot) {
    tipRoot.querySelector('[data-action="openSponsor"]')?.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        handler.emit('openSponsor');
    });
    tipRoot.querySelector('[data-action="openSponsorSite"]')?.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        handler.emit('openExternal', SPONSOR_URL);
    });
}

function showOfficeHelpTip(vditor, sponsorBaseUrl) {
    const tipEl = vditor.tip.element;
    if (tipEl.classList.contains('vditor-tip--show') && tipEl.querySelector('.vditor-help-tip')) {
        vditor.tip.hide();
        return;
    }
    const sponsorHtml = sponsorBaseUrl ? `
    <div class="vditor-help-sponsor">
        <button type="button" class="vditor-help-sponsor-logo-btn" data-action="openSponsor" title="Database Client">
            <img class="vditor-help-sponsor-logo" src="${sponsorBaseUrl}/icon.png" alt="Database Client" draggable="false"/>
        </button>
        <span class="vditor-help-sponsor-text">Supported by <a href="${SPONSOR_URL}" data-action="openSponsorSite">Database Client</a></span>
    </div>` : '';
    vditor.tip.show(`<div class="vditor-help-tip">
    <div class="vditor-help-tip__links">
        <a href="https://github.com/cweijan/vscode-office/issues" target="_blank">Issues</a>
        <span class="vditor-help-tip__divider">|</span>
        <a href="https://ld246.com/article/1582778815353" target="_blank">键盘快捷键</a>
    </div>${sponsorHtml}
</div>`, 0);
    bindOfficeHelpTip(vditor.tip.element);
}

export async function getToolbar(resPath, sponsorBaseUrl, language) {
    const helpTip = language?.toLowerCase().startsWith('zh') ? '帮助' : 'Help';
    const codicon = (name) => `<span class="codicon codicon-${name}" aria-hidden="true"></span>`;
    return [
        'outline',
        "headings",
        "bold",
        "italic",
        "strike",
        "link",
        "|",
        {
            name: 'edit-in-vscode',
            tipPosition: 'e',
            tip: `Edit In VSCode (${shortcutTip})`,
            className: 'right',
            icon: await loadRes(`${resPath}/vscode.svg`),
            click() {
                handler.emit("editInVSCode", true)
            }
        },
        {
            tipPosition: 'e',
            tip: 'Export To Pdf',
            className: 'right',
            icon: codicon('file-pdf'),
            click() {
                handler.emit("export")
            }
        },
        { name: 'upload', tipPosition: 'e' },
        "|",
        {
            name: 'editor-theme-label',
            tipPosition: 'e',
        },
        {
            name: 'editor-theme',
            tipPosition: 'e',
        },
        "code-theme",
        "|",
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
        'insert-before',
        'insert-after',
        "|",
        "undo",
        "redo",
        "|",
        "edit-mode",
        {
            tip: helpTip,
            tipPosition: 'e',
            icon: codicon('question'),
            click(event, vditor) {
                showOfficeHelpTip(vditor, sponsorBaseUrl);
            }
        },
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

const editorSession = {
    scrollTop: 0,
    scrollSaveTimer: 0,
    anchorTarget: null,
    anchorUntil: 0,
    restoring: false,
    resizeObserver: null,
};

function getEditorElement() {
    return document.querySelector('.vditor-reset');
}

function persistScroll() {
    const editorEl = getEditorElement();
    if (!editorEl) {
        return;
    }
    editorSession.scrollTop = editorEl.scrollTop;
    window.clearTimeout(editorSession.scrollSaveTimer);
    handler.emit('scroll', { scrollTop: editorEl.scrollTop });
}

function schedulePersistScroll() {
    window.clearTimeout(editorSession.scrollSaveTimer);
    editorSession.scrollSaveTimer = window.setTimeout(() => {
        persistScroll();
    }, 200);
}

function stopAnchoredScrollRestore() {
    editorSession.anchorTarget = null;
    editorSession.anchorUntil = 0;
    editorSession.resizeObserver?.disconnect();
    editorSession.resizeObserver = null;
}

function applyEditorScroll(top) {
    const editorEl = getEditorElement();
    if (!editorEl || top == null || Number.isNaN(top)) {
        return false;
    }
    editorSession.restoring = true;
    editorEl.scrollTop = top;
    editorSession.scrollTop = top;
    window.requestAnimationFrame(() => {
        editorSession.restoring = false;
    });
    return true;
}

function syncAnchoredScrollRestore() {
    const editorEl = getEditorElement();
    const target = editorSession.anchorTarget;
    if (!editorEl || target == null || Date.now() > editorSession.anchorUntil) {
        stopAnchoredScrollRestore();
        return;
    }
    if (Math.abs(editorEl.scrollTop - target) > 1) {
        applyEditorScroll(target);
    }
}

function startAnchoredScrollRestore(top) {
    stopAnchoredScrollRestore();
    editorSession.scrollTop = top;
    editorSession.anchorTarget = top;
    editorSession.anchorUntil = Date.now() + 4000;

    syncAnchoredScrollRestore();
    for (const ms of [16, 50, 100, 200, 400, 800, 1600, 2500, 3500]) {
        window.setTimeout(syncAnchoredScrollRestore, ms);
    }

    const editorEl = getEditorElement();
    if (!editorEl) {
        return;
    }
    editorSession.resizeObserver = new ResizeObserver(() => {
        syncAnchoredScrollRestore();
    });
    editorSession.resizeObserver.observe(editorEl);
    if (editorEl.firstElementChild) {
        editorSession.resizeObserver.observe(editorEl.firstElementChild);
    }
}

export function setupEditorSession() {
    const editorEl = getEditorElement();
    if (!editorEl) {
        return;
    }

    editorEl.addEventListener('scroll', () => {
        if (editorSession.restoring) {
            return;
        }
        editorSession.scrollTop = editorEl.scrollTop;
        if (editorSession.anchorTarget != null &&
            Math.abs(editorEl.scrollTop - editorSession.anchorTarget) > 8) {
            stopAnchoredScrollRestore();
        }
        schedulePersistScroll();
    }, { passive: true });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            persistScroll();
            return;
        }
        applyEditorScroll(editorSession.scrollTop);
    });

    window.addEventListener('blur', persistScroll);
    window.addEventListener('focus', () => {
        applyEditorScroll(editorSession.scrollTop);
    });
}

export function scrollEditor(top) {
    const target = Number(top);
    if (Number.isNaN(target)) {
        return;
    }
    startAnchoredScrollRestore(target);
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
}