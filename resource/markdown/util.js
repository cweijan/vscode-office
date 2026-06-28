function loadRes(url) {
    return fetch(url).then(r => r.text())
}

const isMac = navigator.userAgent.includes('Mac OS');
const shortcutTip = isMac ? '⌘ ^ E' : 'Ctrl Alt E';

export async function getToolbar(resPath, onSave = null) {
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
            tip: `Edit In VSCode (${shortcutTip})`,
            className: 'right',
            icon: codicon('edit'),
            click() {
                handler.emit("editInVSCode", true)
            }
        },
        {
            name: 'save',
            tip: 'Save',
            className: 'right',
            icon: codicon('save'),
            click() {
                handler.emit('telemetry', { event: 'markdown.save', properties: { source: 'toolbar' } });
                onSave?.()
            }
        },
        'upload',
        "|",
        'editor-theme-label',
        "editor-theme",
        "editor-theme-toggle",
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
        "|",
        "undo",
        "redo",
        "|",
        "find",
        "ai-settings",
        "settings",
        "help",
    ]
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

const getSelectedHtml = () => {
    const selection = document.getSelection()
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return ''
    const editorRoot = document.getElementById('vditor')
    if (!editorRoot?.contains(selection.anchorNode) || !editorRoot.contains(selection.focusNode)) return ''
    const container = document.createElement('div')
    for (let i = 0; i < selection.rangeCount; i++) {
        container.appendChild(selection.getRangeAt(i).cloneContents())
    }
    return container.innerHTML
}

const normalizePlainText = text => {
    return (text || '')
        .replace(/\u00a0/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
}

const htmlToPlainText = html => {
    if (!html) return ''
    const container = document.createElement('div')
    container.innerHTML = html
    container.querySelectorAll(
        '.vditor-ir__marker, .vditor-ir__preview, .vditor-toolbar, .vditor-hint, script, style',
    ).forEach(item => item.remove())
    container.querySelectorAll('br').forEach(item => item.replaceWith('\n'))
    container.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6, li, tr, pre, blockquote').forEach(item => {
        item.appendChild(document.createTextNode('\n'))
    })
    return normalizePlainText(container.textContent || '')
}

const getSelectedPlainText = () => {
    const selection = document.getSelection()
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return ''
    const editorRoot = document.getElementById('vditor')
    if (!editorRoot?.contains(selection.anchorNode) || !editorRoot.contains(selection.focusNode)) return ''
    const container = document.createElement('div')
    for (let i = 0; i < selection.rangeCount; i++) {
        container.appendChild(selection.getRangeAt(i).cloneContents())
    }
    return htmlToPlainText(container.innerHTML) || normalizePlainText(selection.toString())
}

const copyHtml = async (html) => {
    if (!html) return
    if (navigator.clipboard?.write && window.ClipboardItem) {
        await navigator.clipboard.write([
            new ClipboardItem({
                'text/html': new Blob([html], { type: 'text/html' }),
                'text/plain': new Blob([html], { type: 'text/plain' }),
            }),
        ])
        return
    }
    await navigator.clipboard.writeText(html)
}

const copyPlainText = async (text) => {
    if (!text) return
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
        return
    }
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.left = '-9999px'
    textarea.style.top = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    textarea.remove()
}

export const setAIAvailable = (available, editor) => {
    editor?.setCopilotAvailable?.(available);
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
        if (!item || (item.classList.contains('vditor-context-menu__item--desktop-only') && document.body.classList.contains('is-web'))) return
        closeMenu()
        const action = item.dataset.action
        switch (action) {
            case 'copy':
                handler.emit('telemetry', { event: 'markdown.copy' })
                document.execCommand('copy')
                break
            case 'copyAsHtml':
                handler.emit('telemetry', { event: 'markdown.copyAsHtml' })
                copyHtml(getSelectedHtml() || editor.getHTML())
                break
            case 'copyAsPlainText':
                handler.emit('telemetry', { event: 'markdown.copyAsPlainText' })
                copyPlainText(getSelectedPlainText() || htmlToPlainText(editor.getHTML()))
                break
            case 'paste':
                handler.emit('telemetry', { event: 'markdown.paste' })
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
            case 'showInFolder':
                vscodeEvent.emit('showInFolder')
                break
            case 'insertImage':
                vscodeEvent.emit('insertImage')
                break
            case 'aiPolish':
                editor.openAIPolishDialog()
                break
        }
    })
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


const isInsideCodeMirrorTarget = (target) => {
    const node = target?.nodeType === 1 ? target : target?.parentElement;
    return !!node?.closest?.(".vditor-code-block--cm .cm-editor");
};

export const bindShortcut = (handler, editor) => {
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
                    if (editor.isDirty?.()) {
                        handler.emit('telemetry', { event: 'markdown.save', properties: { source: 'shortcut' } });
                        vscodeEvent.emit("doSave", editor.getValue());
                        editor.markSaved();
                    }
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
                        // vscode webview only: 修复剪切后选中文本没有被清除
                        document.execCommand("delete")
                    }
                    e.preventDefault();
                    break;
            }
        }
    }, isMac ? true : undefined)

    window.onresize = () => {
        document.getElementById('vditor').style.height = '100%'
    }
}
