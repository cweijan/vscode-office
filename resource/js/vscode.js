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
    var style = document.createElement('style');
    style.innerText = css;
    document.documentElement.appendChild(style)
}



window.addThemeCss = function () {
    addCss(`
    *{
        background-color: var(--vscode-editor-background) !important;
        color: var(--vscode-editor-foreground) !important;
    }
    `);
}

