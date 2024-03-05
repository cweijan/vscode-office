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

function zoomElement(selector, rate = 5) {
    window.onmousewheel = document.onmousewheel = e => {
        if (!e.ctrlKey || e.metaKey) return;
        const eles = document.querySelectorAll(selector);
        for (const ele of eles) {
            const zoom = ele.style.zoom ? parseInt(ele.style.zoom.replace("%", "")) : 100
            if (e.deltaY > 0) {
                ele.style.zoom = `${zoom - rate}%`;
            } else {
                ele.style.zoom = `${zoom + rate}%`;
            }
        }
    };
}

window.addEventListener('keydown', e => {
    if (e.code == 'F12') window.vscodeEvent.emit('developerTool')
    else if ((isCompose(e) && e.code == 'KeyV')) e.preventDefault()  // vscode的bug, hebrew(希伯来语)键盘会粘贴两次
  })