const vscode = typeof (acquireVsCodeApi) != 'undefined' ? acquireVsCodeApi() : null;
const postMessage = (message) => { if (vscode) { vscode.postMessage(message) } }

export const bindVSCodeEvent = () => {
    let events = {}
    let init = false;
    function receive({ data }) {
        if (!data) return;
        const cbs = events[data.type]
        if (cbs) {
            for (const cb of cbs)
                cb(data.content)
        }
    }
    return {
        /**
         * 注册监听器监听后端事件
         */
        on(event, callback) {
            this.tryInit();
            if (!events[event]) events[event] = []
            events[event].push(callback)
            return this;
        },
        /**
         * 立刻触发一个后端事件, 由前端处理
         */
        emitImmediately(type, content) {
            receive({ data: { type, content } })
        },
        /**
         * 发送事件到后端
         */
        emit(event, data) {
            this.tryInit();
            postMessage({ type: event, content: data })
        },
        tryInit() {
            if (init) return;
            init = true;
            window.addEventListener('message', receive)
        },
        clear(clearEvents) {
            for (const event of clearEvents) {
                delete events[event]
            }
        }
    }
}

export const getVSCodeEvent = () => {
    return window.eventBus || (window.eventBus = bindVSCodeEvent())
}

export const isBrowser = !navigator?.userAgent?.includes('Electron');

export function isCompose(e) {
    if (!e) return false;
    return e.ctrlKey || e.metaKey
}