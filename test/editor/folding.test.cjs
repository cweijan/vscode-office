const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { transformSync } = require('esbuild');
const { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '../..');
const code = transformSync(fs.readFileSync(path.join(root, 'vditor/src/ts/wysiwyg/folding.ts'), 'utf8') +
    '\nwindow.folding = {getFoldRegions, initFolding};', { loader: 'ts', format: 'iife' }).code;
const luteCode = fs.readFileSync(path.join(root, 'vditor/src/js/lute/lute.min.js'), 'utf8');
function fixture(md) {
    const dom = new JSDOM('<div><pre class="vditor-reset" contenteditable="true"></pre></div>',
        {runScripts: 'outside-only', pretendToBeVisual: true});
    const w = dom.window;
    w.eval(code); w.eval(luteCode);
    const lute = w.Lute.New();
    const editor = w.document.querySelector('pre');
    editor.innerHTML = lute.Md2VditorDOM(md);
    const container = editor.parentElement;
    const dispose = w.folding.initFolding(container, editor);
    const buttons = () => [...container.querySelectorAll('button')];
    return {w, editor, container, lute, dispose, buttons,
        regions: () => w.folding.getFoldRegions(editor),
        md: () => lute.VditorDOM2Md(editor.innerHTML),
        visible: el => w.getComputedStyle(el).display !== 'none',
        close: () => { dispose(); w.close(); }};
}
const md = '# One\n\nText\n\n## Child\n\nBody\n\n### Deep\n\nDeep body\n\n## Peer\n\nPeer body\n\n# Two\n\nEnd\n';
test('heading ranges end at the next same or higher level and preserve heading', () => {
    const f = fixture(md);
    const regions = f.regions();
    assert.equal(regions.length, 5);
    assert.equal(regions[0].content.length, 7);
    assert.equal(regions[1].content.length, 3);
    f.buttons()[1].click();
    assert.ok(f.visible(regions[1].owner));
    regions[1].content.forEach(node => assert.equal(f.visible(node), false));
    assert.ok(f.visible(regions[3].owner));
    assert.equal(f.buttons()[1].getAttribute('aria-expanded'), 'false');
    f.buttons()[1].click();
    regions[1].content.forEach(node => assert.ok(f.visible(node)));
    f.close();
});
test('nested heading states remain independent when parent is reopened', () => {
    const f = fixture(md);
    f.buttons()[1].click(); f.buttons()[0].click(); f.buttons()[0].click();
    assert.equal(f.buttons()[1].getAttribute('aria-expanded'), 'false');
    assert.equal(f.visible(f.regions()[1].content[0]), false);
    f.close();
});
test('unordered, ordered and task descendants fold without hiding the parent label', () => {
    for (const text of ['- Parent\n  - Child\n    - Deep\n- Tail\n',
        '1. Parent\n   1. Child\n      1. Deep\n2. Tail\n',
        '- [ ] Parent\n  - [x] Child\n    - Deep\n- Tail\n']) {
        const f = fixture(text);
        assert.equal(f.regions().length, 2);
        f.buttons()[0].click();
        assert.ok(f.visible(f.regions()[0].owner));
        assert.equal(f.visible(f.regions()[0].content[0]), false);
        assert.ok(f.visible(f.editor.lastElementChild.lastElementChild));
        f.close();
    }
});
test('folding does not modify a single editable DOM byte or serialized Markdown', () => {
    const f = fixture(md + '\n- Parent\n  - Child\n');
    const html = f.editor.innerHTML, markdown = f.md();
    for (let i = 0; i < 4; i++) f.buttons().forEach(button => button.click());
    f.buttons()[0].click();
    assert.equal(f.editor.innerHTML, html);
    assert.equal(f.md(), markdown);
    assert.equal(f.lute.VditorDOM2Md(f.lute.Md2VditorDOM(f.md())), markdown);
    f.close();
});
test('caret in folded descendants moves to retained parent', () => {
    const f = fixture(md);
    const range = f.w.document.createRange();
    range.selectNodeContents(f.regions()[0].content[0]); range.collapse(true);
    f.w.getSelection().addRange(range);
    f.buttons()[0].click();
    assert.ok(f.regions()[0].owner.contains(f.w.getSelection().anchorNode));
    f.close();
});
test('editing and history shortcuts reveal content before native handlers run', () => {
    const f = fixture(md);
    f.buttons()[0].click();
    f.editor.dispatchEvent(new f.w.KeyboardEvent('keydown', {key:'Backspace', bubbles:true}));
    assert.equal(f.buttons()[0].getAttribute('aria-expanded'), 'true');
    f.buttons()[0].click();
    f.editor.dispatchEvent(new f.w.InputEvent('beforeinput', {inputType:'historyUndo', bubbles:true}));
    assert.equal(f.buttons()[0].getAttribute('aria-expanded'), 'true');
    f.close();
});
test('DOM replacement clears stale folds and disposal removes controls and hiding rules', async () => {
    const f = fixture(md);
    f.buttons()[0].click();
    f.editor.innerHTML = f.lute.Md2VditorDOM('# New\n\nBody\n');
    await new Promise(resolve => f.w.setTimeout(resolve, 50));
    assert.equal(f.buttons().length, 1);
    assert.equal(f.buttons()[0].getAttribute('aria-expanded'), 'true');
    f.buttons()[0].click(); f.dispose();
    assert.equal(f.buttons().length, 0);
    assert.ok(f.visible(f.editor.lastElementChild));
    f.w.close();
});
test('preview headings and leaf list items do not create folding controls', () => {
    const f = fixture('- Leaf\n');
    f.editor.innerHTML += '<div contenteditable="false"><h1>Preview</h1><p>Body</p></div>';
    assert.equal(f.regions().length, 0);
    f.close();
});


test('replacing a child list retains a working control and caret placement', async () => {
    const f = fixture('- Parent\n  - Old\n');
    const owner = f.regions()[0].owner;
    const child = owner.querySelector('ul');
    const replacement = child.cloneNode(true);
    child.replaceWith(replacement);
    await new Promise(resolve => f.w.setTimeout(resolve, 50));
    const range = f.w.document.createRange();
    range.selectNodeContents(replacement.querySelector('li')); range.collapse(true);
    f.w.getSelection().addRange(range);
    const errors = [];
    f.w.addEventListener('error', event => errors.push(event.message));
    f.buttons()[0].click();
    assert.deepEqual(errors, []);
    assert.ok(owner.contains(f.w.getSelection().anchorNode));
    assert.equal(f.visible(replacement), false);
    f.close();
});
