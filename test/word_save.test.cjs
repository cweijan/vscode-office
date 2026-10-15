const assert = require('node:assert/strict');
const { test } = require('node:test');
const path = require('node:path');
const { buildSync, build } = require('esbuild');
const { JSDOM } = require('jsdom');
const JSZip = require('jszip');

const { window } = new JSDOM('');
global.DOMParser = window.DOMParser;
global.XMLSerializer = window.XMLSerializer;
const compiled = buildSync({
    entryPoints: [path.join(__dirname, '../src/react/view/word/prepareWordSave.ts')],
    bundle: true, platform: 'node', format: 'cjs', write: false,
});
const helper = { exports: {} };
new Function('require', 'module', 'exports', compiled.outputFiles[0].text)(require, helper, helper.exports);
const { prepareWordSave, preserveDocumentNamespaces } = helper.exports;

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const MC = 'http://schemas.openxmlformats.org/markup-compatibility/2006';
const DU = 'http://schemas.microsoft.com/office/word/2023/wordml/word16du';
const M = 'http://schemas.openxmlformats.org/officeDocument/2006/math';
const declaration = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const body = '<w:p><w:ins w:id="1" w:author="Test" w:date="2026-01-01T00:00:00Z" w16du:dateUtc="2026-01-01T00:00:00Z">' +
    '<w:r><w:t xml:space="preserve"> inserted &amp; retained </w:t></w:r></w:ins>' +
    '<w:del w:id="2" w:author="Test" w:date="2026-01-01T00:00:00Z" w16du:dateUtc="2026-01-01T00:00:00Z">' +
    '<w:r><w:delText>deleted</w:delText></w:r></w:del>' +
    '<m:oMath><m:r><m:t>x=1</m:t></m:r></m:oMath></w:p>';
const doc = (content = body, extra = '') => declaration +
    `<w:document xmlns:w="${W}" xmlns:mc="${MC}" xmlns:m="${M}" ${extra}><w:body>${content}</w:body></w:document>`;
const sourceXml = doc(body, `xmlns:w16du="${DU}" mc:Ignorable="w16du"`);
const damagedXml = doc();

function parse(xml) {
    return new DOMParser().parseFromString(xml, 'application/xml');
}

function assertValid(xml) {
    const parsed = parse(xml);
    assert.equal(parsed.getElementsByTagName('parsererror').length, 0, xml);
    return parsed;
}

async function archive(xml, parts = {}) {
    const zip = new JSZip();
    zip.file('[Content_Types].xml', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
        '</Types>');
    zip.file('_rels/.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
        '</Relationships>');
    zip.file('word/document.xml', xml);
    for (const [name, bytes] of Object.entries(parts)) zip.file(name, bytes);
    return zip.generateAsync({ type: 'arraybuffer' });
}

test('restores w16du and mc:Ignorable without changing revisions or native math', () => {
    assert.ok(parse(damagedXml).getElementsByTagName('parsererror').length);
    const result = preserveDocumentNamespaces(sourceXml, damagedXml);
    const parsed = assertValid(result);
    assert.ok(result.startsWith(declaration));
    assert.equal(parsed.documentElement.lookupNamespaceURI('w16du'), DU);
    assert.equal(parsed.documentElement.getAttributeNS(MC, 'Ignorable'), 'w16du');
    for (const name of ['ins', 'del']) {
        const node = parsed.getElementsByTagNameNS(W, name)[0];
        assert.equal(node.getAttributeNS(DU, 'dateUtc'), '2026-01-01T00:00:00Z');
    }
    assert.equal(parsed.getElementsByTagNameNS(W, 't')[0].textContent, ' inserted & retained ');
    assert.equal(parsed.getElementsByTagNameNS(W, 't')[0].getAttribute('xml:space'), 'preserve');
    assert.equal(parsed.getElementsByTagNameNS(M, 'oMath').length, 1);
    assert.equal(parsed.getElementsByTagNameNS(M, 't')[0].textContent, 'x=1');
});

test('preserves arbitrary extension bindings and merges Ignorable tokens idempotently', () => {
    const original = doc('<w:p custom:flag="yes"/>', 'xmlns:custom="urn:custom" mc:Ignorable="custom"');
    const exported = doc('<w:p custom:flag="yes"/>', 'xmlns:other="urn:other" mc:Ignorable="other"');
    const result = preserveDocumentNamespaces(original, exported);
    const parsed = assertValid(result);
    assert.equal(parsed.documentElement.getAttributeNS(MC, 'Ignorable'), 'other custom');
    assert.equal(parsed.getElementsByTagNameNS(W, 'p')[0].getAttributeNS('urn:custom', 'flag'), 'yes');
    assert.equal(preserveDocumentNamespaces(original, result), result);
});

test('keeps local namespace overrides, comments, processing instructions and CDATA', () => {
    const content = '<!-- body comment --><w:p xmlns:custom="urn:local" custom:flag="local">' +
        '<w:r><w:t><![CDATA[A < B]]></w:t></w:r></w:p>';
    const original = doc(content, 'xmlns:custom="urn:original"');
    const exported = doc(content).replace(declaration, declaration + '<?test value?><!-- prolog -->');
    const result = preserveDocumentNamespaces(original, exported);
    const parsed = assertValid(result);
    assert.equal(parsed.getElementsByTagNameNS(W, 'p')[0].getAttributeNS('urn:local', 'flag'), 'local');
    assert.ok(result.includes('<?test value?>'));
    assert.ok(result.includes('<!-- prolog -->'));
    assert.ok(result.includes('<![CDATA[A < B]]>'));
});

test('does not guess unknown namespace URIs or silently replace conflicting bindings', () => {
    assert.throws(() => preserveDocumentNamespaces(doc('<w:p/>'), damagedXml), /invalid XML/);
    assert.throws(() => preserveDocumentNamespaces(sourceXml, doc(body, 'xmlns:w16du="urn:wrong"')), /conflicting/);
    assert.throws(() => preserveDocumentNamespaces(doc('<w:p/>'), doc('<w:p/>', 'mc:Ignorable="unknown"')), /undeclared/);
});

test('rejects malformed XML and unexpected roots', () => {
    assert.throws(() => preserveDocumentNamespaces(sourceXml, damagedXml.replace('</w:p>', '')), /invalid XML/);
    assert.throws(() => preserveDocumentNamespaces(sourceXml, '<not-a-document/>'), /unexpected/);
    assert.throws(() => preserveDocumentNamespaces('<not-a-document/>', damagedXml), /unexpected/);
});

test('passes through an already-valid archive without recompressing it', async () => {
    const original = await archive(sourceXml);
    assert.equal(await prepareWordSave(original, original), original);
});

test('changes only document.xml, leaving styles, comments, relationships and media intact', async () => {
    const parts = {
        'word/styles.xml': `<w:styles xmlns:w="${W}"/>`,
        'word/comments.xml': `<w:comments xmlns:w="${W}"><w:comment w:id="5"><w:p><w:r><w:t>Test comment</w:t></w:r></w:p></w:comment></w:comments>`,
        'word/media/image1.png': new Uint8Array([0, 1, 127, 255]),
    };
    const original = await archive(sourceXml, parts);
    const damaged = await archive(damagedXml, parts);
    const result = await prepareWordSave(original, damaged);
    const before = await JSZip.loadAsync(damaged);
    const after = await JSZip.loadAsync(result, { checkCRC32: true });
    assert.deepEqual(Object.keys(after.files).sort(), Object.keys(before.files).sort());
    for (const entry of Object.values(before.files)) {
        if (!entry.dir && entry.name !== 'word/document.xml') {
            assert.deepEqual(await after.file(entry.name).async('uint8array'), await entry.async('uint8array'));
        }
    }
    assertValid(await after.file('word/document.xml').async('string'));
});

test('refuses invalid other XML parts and missing main documents', async () => {
    const original = await archive(sourceXml);
    for (const name of ['word/comments.xml', 'word/_rels/document.xml.rels']) {
        const damaged = await archive(damagedXml, { [name]: '<broken>' });
        await assert.rejects(prepareWordSave(original, damaged), /invalid XML/);
    }
    const empty = await new JSZip().generateAsync({ type: 'arraybuffer' });
    await assert.rejects(prepareWordSave(original, empty), /missing word\/document.xml/);
});

test('repairs tracked math exported by the actual 1.x serializer', async () => {
    const { parseDocx, repackDocx } = require('@eigenpal/docx-editor-core/docx');
    const original = await archive(doc(
        '<w:p><m:oMath><m:r><w:ins w:id="1" w:author="Test" w:date="2026-01-01T00:00:00Z" ' +
        'w16du:dateUtc="2026-01-01T00:00:00Z"><m:t>x=1</m:t></w:ins></m:r></m:oMath></w:p>' +
        '<w:p><w:r><w:t>Before edit</w:t></w:r></w:p>',
        `xmlns:w16du="${DU}" mc:Ignorable="w16du"`,
    ));
    const parsed = await parseDocx(original);
    parsed.package.document.content[1].content[0].content[0].text = 'After edit';
    const exported = await repackDocx(parsed);
    const zip = await JSZip.loadAsync(exported);
    const exportedXml = await zip.file('word/document.xml').async('string');
    assert.ok(exportedXml.includes('w16du:dateUtc'), 'fixture must exercise retained tracked-change XML');
    assert.ok(parse(exportedXml).getElementsByTagName('parsererror').length, '1.x regression must reproduce');
    const result = await prepareWordSave(original, exported);
    const repaired = await JSZip.loadAsync(result);
    const repairedDoc = assertValid(await repaired.file('word/document.xml').async('string'));
    assert.equal(repairedDoc.getElementsByTagNameNS(W, 'ins')[0].getAttributeNS(DU, 'dateUtc'), '2026-01-01T00:00:00Z');
    assert.ok(repairedDoc.documentElement.textContent.includes('After edit'));
});

test('toolbar and keyboard saves validate before emitting; failures leave the editor mounted', { timeout: 5000 }, async () => {
    const React = require('react');
    const { createRoot } = require('react-dom/client');
    global.window = window;
    global.document = window.document;
    global.IS_REACT_ACT_ENVIRONMENT = true;
    const harness = global.wordSaveTest = {
        events: [], callbacks: {}, props: null, output: await archive(damagedXml),
    };
    const mocks = {
        '@ant-design/icons': 'exports.MoonOutlined = exports.SunOutlined = () => null;',
        'antd': `const React = require('react'); exports.Spin = () => null;
            exports.Alert = ({message}) => React.createElement('div', {role: 'alert'}, message);`,
        '@eigenpal/docx-editor-react': `const React = require('react');
            exports.DocxEditor = React.forwardRef((props, ref) => {
                global.wordSaveTest.props = props;
                React.useImperativeHandle(ref, () => ({save: async () => {
                    await props.onSave(global.wordSaveTest.output);
                    return global.wordSaveTest.output;
                }}));
                return React.createElement('div', {'data-editor': true});
            });`,
        '../../util/vscode': `exports.vscodeApi = {};
            exports.handler = {
                on(name, callback) { global.wordSaveTest.callbacks[name] = callback; return this; },
                emit(...event) {
                    global.wordSaveTest.events.push(event);
                    if (event[0] === 'save') global.wordSaveTest.onSaveEmitted?.();
                    return this;
                }
            };`,
        '../components/SponsorBar': 'module.exports = () => null;',
    };
    const compiledWord = await build({
        entryPoints: [path.join(__dirname, '../src/react/view/word/Word.tsx')],
        bundle: true, platform: 'node', format: 'cjs', jsx: 'automatic', write: false,
        external: ['react', 'react/jsx-runtime'],
        plugins: [{ name: 'word-ui-stubs', setup(builder) {
            builder.onResolve({ filter: /.*/ }, args => {
                if (args.path.endsWith('.css')) return { path: args.path, namespace: 'empty' };
                if (mocks[args.path]) return { path: args.path, namespace: 'stub' };
            });
            builder.onLoad({ filter: /.*/, namespace: 'empty' }, () => ({ contents: '' }));
            builder.onLoad({ filter: /.*/, namespace: 'stub' }, args => ({ contents: mocks[args.path] }));
        }}],
    });
    const component = { exports: {} };
    new Function('require', 'module', 'exports', compiledWord.outputFiles[0].text)(require, component, component.exports);
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    try {
        await React.act(async () => root.render(React.createElement(component.exports.default)));
        await React.act(async () => {
            harness.callbacks.open({ buffer: [...new Uint8Array(await archive(sourceXml))] });
        });
        assert.ok(container.querySelector('[data-editor]'));
        const saves = () => harness.events.filter(event => event[0] === 'save');
        await React.act(async () => harness.props.onSave(harness.output));
        assert.equal(saves().length, 1);
        const first = await JSZip.loadAsync(new Uint8Array(saves()[0][1]));
        assertValid(await first.file('word/document.xml').async('string'));
        await React.act(async () => {
            const saved = new Promise(resolve => { harness.onSaveEmitted = resolve; });
            window.dispatchEvent(new window.KeyboardEvent('keydown', { ctrlKey: true, code: 'KeyS' }));
            await saved;
        });
        assert.equal(saves().length, 2, 'keyboard save must not emit twice');
        harness.output = await archive(damagedXml, { 'word/comments.xml': '<broken>' });
        await React.act(async () => harness.props.onSave(harness.output));
        assert.equal(saves().length, 2, 'invalid exports must not reach the host');
        assert.match(container.querySelector('[role="alert"]').textContent, /invalid XML/);
        assert.ok(container.querySelector('[data-editor]'), 'save failures must retain unsaved edits');

        const oldSave = harness.props.onSave;
        await React.act(async () => {
            harness.callbacks.open({ buffer: [...new Uint8Array(await archive(sourceXml))], nonce: 2 });
        });
        await React.act(async () => oldSave(await archive(damagedXml)));
        assert.equal(saves().length, 2, 'a stale editor callback must not save into another document');
    } finally {
        await React.act(async () => root.unmount());
        container.remove();
        delete global.wordSaveTest;
    }
});
