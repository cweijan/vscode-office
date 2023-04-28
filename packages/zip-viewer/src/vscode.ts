// @ts-ignore
const vscode = typeof (window.acquireVsCodeApi) != 'undefined' ? window.acquireVsCodeApi() : null;
const postMessage = (message: any) => {
    if (vscode) {
        vscode.postMessage(message)
    }
}

export const getVscodeEvent = () => {
    let events: { [event: string]: Function } = {}
    let init = false;

    function receive({data}: any) {
        if (!data)
            return;
        if (events[data.type]) {
            events[data.type](data.content);
        }
    }

    return {
        emitImmediately(type: string, content: any) {
            if (events[type]) events[type](content);
        },
        on(event: string, callback: (data: any) => void) {
            this.tryInit();
            events[event] = callback
            return this;
        },
        emit(event: string, data?: any) {
            this.tryInit();
            postMessage({type: event, content: data})
        },
        tryInit() {
            if (init) return;
            init = true;
            window.addEventListener('message', receive)
        },
        destroy() {
            window.removeEventListener('message', receive)
            init = false;
        }
    }
}

export const isBrowser = !navigator?.userAgent?.includes('Electron');
