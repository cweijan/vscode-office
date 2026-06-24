function unavailable(method: string): never {
    throw new Error(`Node.js "child_process.${method}" is not available in the web extension host.`);
}

function stubFn(method: string) {
    return () => unavailable(method);
}

export const spawn = stubFn('spawn');
export const exec = stubFn('exec');

export default {
    spawn,
    exec,
};
