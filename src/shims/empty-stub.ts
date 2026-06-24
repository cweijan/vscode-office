function unavailable(moduleName: string): never {
    throw new Error(`Node.js "${moduleName}" is not available in the web extension host.`);
}

export default new Proxy({}, {
    get(_target, prop) {
        if (prop === '__esModule') {
            return true;
        }
        return () => unavailable(String(prop));
    },
});
