const vscode = typeof (acquireVsCodeApi) != "undefined" ? acquireVsCodeApi() : null;
const postMessage = (message) => { if (vscode) { vscode.postMessage(message) } }

let events = {}
function receive({ data }) {
    if (!data)
        return;
    if (events[data.type]) {
        events[data.type](data.content);
    }
}
window.addEventListener('message', receive)
const isMac = navigator.userAgent.includes('Mac OS');
window.addEventListener('keydown', e => {
    if (isMac && isCompose(e) && (e.altKey || e.code == 'KeyW')) {
        e.preventDefault()
    }
}, isMac ? true : undefined)

const getVscodeEvent = () => {
    return {
        on(event, data) {
            events[event] = data
            return this;
        },
        emit(event, data) {
            postMessage({ type: event, content: data })
        }
    }
}

window.vscodeEvent = getVscodeEvent();
window.handler = getVscodeEvent();

function addCss(css) {
    const style = document.createElement('style');
    style.innerText = css;
    document.documentElement.appendChild(style)
}



window.addThemeCss = function () {
    addCss(`
    *{
        background-color: var(--vscode-editor-background) !important;
        color: var(--vscode-editor-foreground) !important;
    }
    *{
        border-color: var(--vscode-quickInputTitle-background) !important;
    }
    `);
}

function isCompose(e) {
    return e.metaKey || e.ctrlKey;
}

function zoomElement(selector, rate = 12) {
    const zoomBase = Math.pow(1 + rate / 100, 1 / 100);
    const minZoom = 25;
    const maxZoom = 2000;

    const onWheel = (e) => {
        if (!e.ctrlKey || e.metaKey) return;

        const eles = document.querySelectorAll(selector);
        if (!eles.length) return;

        e.preventDefault();

        const factor = Math.pow(zoomBase, -e.deltaY);
        for (const ele of eles) {
            const current = ele.style.zoom
                ? parseFloat(ele.style.zoom.replace("%", ""))
                : 100;
            const next = Math.min(maxZoom, Math.max(minZoom, current * factor));
            ele.style.zoom = `${next}%`;
        }
    };

    window.addEventListener('wheel', onWheel, { passive: false });
}

function isInsideCodeMirrorTarget(target) {
    const node = target?.nodeType === 1 ? target : target?.parentElement;
    return !!node?.closest?.(".vditor-code-block--cm .cm-editor");
}

window.addEventListener('keydown', e => {
    if (e.code == 'F12') window.vscodeEvent.emit('developerTool')
    else if ((isCompose(e) && e.code == 'KeyV')
        && !isInsideCodeMirrorTarget(e.target)
        && !isInsideCodeMirrorTarget(document.activeElement)) {
        e.preventDefault()  // vscode的bug, hebrew(希伯来语)键盘会粘贴两次
    }
})