const normalizeMarkdown = (content: string) => content.replace(/\r/g, '');

/** Serialize writebacks and identify their change notifications while they are in flight. */
export class MarkdownDocumentSync {
    private queue: Promise<unknown> = Promise.resolve();
    private writingContent: string | undefined;

    constructor(private readonly write: (content: string) => PromiseLike<boolean>) {}

    isWriteback(content: string): boolean {
        return this.writingContent !== undefined && this.writingContent === normalizeMarkdown(content);
    }

    update(content: string): Promise<boolean> {
        const normalized = normalizeMarkdown(content);
        const operation = this.queue.then(async () => {
            this.writingContent = normalized;
            try {
                return await this.write(normalized);
            } finally {
                this.writingContent = undefined;
            }
        });
        // A failed write must not prevent subsequent edits from being synchronized.
        this.queue = operation.catch(() => undefined);
        return operation;
    }
}
