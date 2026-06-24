export async function createExtractorFromData() {
    throw new Error('RAR archives are not supported in the web extension host yet.');
}

export class UnrarError extends Error { }
