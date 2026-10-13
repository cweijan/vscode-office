import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { transformSync } from 'esbuild';

const source = readFileSync(new URL('../../src/service/markdown/documentSync.ts', import.meta.url), 'utf8');
const { code } = transformSync(source, { loader: 'ts', format: 'esm' });
const { MarkdownDocumentSync } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);

const deferred = () => {
    let resolve;
    const promise = new Promise(done => { resolve = done; });
    return { promise, resolve };
};

test('delayed writeback is ignored even after newer input arrives', async () => {
    const gate = deferred();
    let editorContent = 'first\n';
    let redraws = 0;
    const sync = new MarkdownDocumentSync(async content => {
        await gate.promise;
        // Simulate onDidChangeTextDocument before applyEdit resolves on a remote host.
        if (!sync.isWriteback(content) && editorContent !== content) {
            editorContent = content;
            redraws++;
        }
        return true;
    });
    const update = sync.update(editorContent);
    await Promise.resolve();
    editorContent = 'first\nnew input';
    assert.equal(sync.isWriteback('first\r\n'), true);
    assert.equal(sync.isWriteback('external change'), false);
    gate.resolve();
    await update;
    assert.equal(redraws, 0);
    assert.equal(editorContent, 'first\nnew input');
    // The same text arriving later as a genuine external edit must not be ignored.
    assert.equal(sync.isWriteback('first\n'), false);
});

test('writebacks are serialized and preserve the newest content', async () => {
    const gate = deferred();
    const writes = [];
    const sync = new MarkdownDocumentSync(async content => {
        writes.push(content);
        if (content === 'old') await gate.promise;
        return true;
    });
    const first = sync.update('old');
    await Promise.resolve();
    const second = sync.update('new');
    await Promise.resolve();
    assert.deepEqual(writes, ['old']);
    assert.equal(sync.isWriteback('old'), true);
    gate.resolve();
    await Promise.all([first, second]);
    assert.deepEqual(writes, ['old', 'new']);
    assert.equal(sync.isWriteback('new'), false);
});

test('a rejected write clears its marker and allows the next write', async () => {
    const writes = [];
    const sync = new MarkdownDocumentSync(async content => {
        writes.push(content);
        if (content === 'failed') throw new Error('write failed');
        return true;
    });
    await assert.rejects(sync.update('failed'), /write failed/);
    assert.equal(sync.isWriteback('failed'), false);
    assert.equal(await sync.update('retry'), true);
    assert.deepEqual(writes, ['failed', 'retry']);
});
