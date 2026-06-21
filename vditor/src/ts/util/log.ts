export const log = (method: string, content: string, type: string, print: boolean) => {
    if (print) {
        // @ts-ignore
        console.log(`${method} - ${type}: ${content}`);
    }
};

export const formatMs = (ms: number) => `${ms.toFixed(2)}ms`;

export const logPerf = (print: boolean, label: string, data: Record<string, string>) => {
    if (print) {
        console.log(label, data);
    }
};
