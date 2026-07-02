type Listener = (...args: unknown[]) => void;

class EventEmitterLike {
    private listeners = new Map<string, Set<Listener>>();

    on(event: string, listener: Listener) {
        const set = this.listeners.get(event) ?? new Set<Listener>();
        set.add(listener);
        this.listeners.set(event, set);
        return this;
    }

    addListener(event: string, listener: Listener) {
        return this.on(event, listener);
    }

    once(event: string, listener: Listener) {
        const wrapped: Listener = (...args) => {
            this.removeListener(event, wrapped);
            listener(...args);
        };
        return this.on(event, wrapped);
    }

    emit(event: string, ...args: unknown[]) {
        const set = this.listeners.get(event);
        if (!set) {
            return false;
        }
        for (const listener of [...set]) {
            listener(...args);
        }
        return true;
    }

    removeListener(event: string, listener: Listener) {
        this.listeners.get(event)?.delete(listener);
        return this;
    }

    off(event: string, listener: Listener) {
        return this.removeListener(event, listener);
    }

    removeAllListeners(event?: string) {
        if (event) {
            this.listeners.delete(event);
        } else {
            this.listeners.clear();
        }
        return this;
    }

    listenersFor(event: string) {
        return [...(this.listeners.get(event) ?? [])];
    }
}

export class Stream extends EventEmitterLike {
    pipe<T>(destination: T): T {
        return destination;
    }

    pause() {
        return this;
    }

    resume() {
        return this;
    }
}

export class Readable extends Stream {}
export class Writable extends Stream {}
export class Duplex extends Stream {}
export class Transform extends Duplex {}
export class PassThrough extends Transform {}

export function finished(_stream: unknown, callback?: (error?: Error | null) => void) {
    callback?.(null);
}

export function pipeline(...args: unknown[]) {
    const callback = typeof args[args.length - 1] === 'function'
        ? args[args.length - 1] as (error?: Error | null) => void
        : null;
    callback?.(null);
}

export default {
    Duplex,
    PassThrough,
    Readable,
    Stream,
    Transform,
    Writable,
    finished,
    pipeline,
};
