import { EventEmitter } from 'events';
import { WebviewPanel } from 'vscode';

export class PanelHandler {
    constructor(
        public readonly panel: WebviewPanel,
        private readonly eventEmitter: EventEmitter
    ) { }

    on(event: string, callback: (content: unknown) => void | Promise<void>): this {
        if (event !== 'ready') {
            const listeners = this.eventEmitter.listeners(event);
            if (listeners.length >= 1) {
                this.eventEmitter.removeListener(event, listeners[0] as (...args: unknown[]) => void);
            }
        }
        this.eventEmitter.on(event, async (content: unknown) => {
            await callback(content);
        });
        return this;
    }

    emit(event: string, content?: unknown): this {
        this.panel.webview.postMessage({ type: event, content });
        return this;
    }

    static bind(panel: WebviewPanel): PanelHandler {
        const eventEmitter = new EventEmitter();
        panel.onDidDispose(() => eventEmitter.emit('dispose'));
        panel.webview.onDidReceiveMessage((message: { type: string; content?: unknown }) => {
            eventEmitter.emit(message.type, message.content);
        });
        return new PanelHandler(panel, eventEmitter);
    }
}
