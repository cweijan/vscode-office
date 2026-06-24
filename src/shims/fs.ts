function unavailable(method: string): never {
    throw new Error(`Node.js "fs.${method}" is not available in the web extension host.`);
}

function stubFn(method: string) {
    return () => unavailable(method);
}

export const readFileSync = stubFn('readFileSync');
export const writeFileSync = stubFn('writeFileSync');
export const existsSync = () => false;
export const mkdirSync = stubFn('mkdirSync');
export const copyFileSync = stubFn('copyFileSync');
export const readdirSync = () => [] as string[];
export const renameSync = stubFn('renameSync');
export const lstatSync = () => ({ isDirectory: () => false, isFile: () => true });
export const rm = stubFn('rm');
export const createReadStream = stubFn('createReadStream');
export const promises = {
    access: async () => unavailable('promises.access'),
};

export default {
    readFileSync,
    writeFileSync,
    existsSync,
    mkdirSync,
    copyFileSync,
    readdirSync,
    rm,
    createReadStream,
    promises,
};
