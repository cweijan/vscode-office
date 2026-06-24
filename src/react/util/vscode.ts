const vscode = window['acquireVsCodeApi']?.();
export { vscode as vscodeApi };
const postMessage = (message) => { if (vscode) { vscode.postMessage(message) } }

const DARK_MODE_KEY = 'office-dark-mode';

export function loadDarkMode(): boolean {
    const state = vscode?.getState?.() as { darkMode?: boolean } | undefined;
    if (state?.darkMode !== undefined) {
        return state.darkMode;
    }
    try {
        return localStorage.getItem(DARK_MODE_KEY) === '1';
    } catch {
        return false;
    }
}

export function saveDarkMode(dark: boolean) {
    try {
        localStorage.setItem(DARK_MODE_KEY, dark ? '1' : '0');
    } catch { }
    if (vscode?.setState) {
        const prev = (vscode.getState?.() ?? {}) as Record<string, unknown>;
        vscode.setState({ ...prev, darkMode: dark });
    }
}

export function applyDarkMode(dark: boolean) {
    document.body.classList.toggle('office-dark', dark);
    saveDarkMode(dark);
}

const events = {}
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
        on(event: string, data) {
            events[event] = data
            return this;
        },
        emit(event: string, data?: any) {
            postMessage({ type: event, content: data })
        }
    }
}
export const handler = getVscodeEvent();

export function isCompose(e) {
    return e.metaKey || e.ctrlKey;
}

window.addEventListener('keydown', e => {
    if (e.code == 'F12') handler.emit('developerTool')
    else if ((isCompose(e) && e.code == 'KeyV')) e.preventDefault()  // vscode的bug, hebrew(希伯来语)键盘会粘贴两次
})