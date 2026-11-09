const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { transformSync } = require('esbuild');
const { JSDOM } = require('jsdom');

const root = path.resolve(__dirname, '../..');
// Exercise the production keyboard handlers with the bundled parser. Rendering,
// toolbar and history notifications are stubs; this is not a browser/VS Code test.
const sourcePath = process.env.LIST_HANDLER_SOURCE || path.join(root, 'vditor/src/ts/util/fixBrowserBehavior.ts');
const source = fs.readFileSync(sourcePath, 'utf8').replace(/^import[\s\S]*?;\s*/gm, '');
const code = transformSync(source + '\nwindow.handlers = {fixList, listOutdent, listIndent};', {
    loader: 'ts', format: 'iife', target: 'es2020',
}).code;
const normalizerCode = transformSync(fs.readFileSync(path.join(root,
    'vditor/src/ts/util/normalizeNestedLists.ts'), 'utf8') +
    '\nwindow.normalizeLists = window.normalizeEmptyNestedLists = normalizeEmptyNestedLists;', {
    loader: 'ts', format: 'iife', target: 'es2020',
}).code;
const luteSource = fs.readFileSync(path.join(root, 'vditor/src/js/lute/lute.min.js'), 'utf8');

function fixture(markdown) {
    const dom = new JSDOM('<div class="vditor-reset" contenteditable="true"></div>', { runScripts: 'outside-only' });
    const w = dom.window;
    w.eval(luteSource);
    const lute = w.Lute.New();
    const element = w.document.querySelector('div');
    element.innerHTML = lute.Md2VditorDOM(markdown);
    const closest = (node, tag) => (node.nodeType === 3 ? node.parentElement : node).closest(tag.toLowerCase());
    Object.assign(w, {
        Constants: { ZWSP: '\u200b' },
        isCtrl: event => event.ctrlKey || event.metaKey,
        hasClosestByMatchTag: closest,
        getTopList: node => {
            let list = closest(node, 'ul,ol');
            while (list?.parentElement?.closest('ul,ol')) list = list.parentElement.closest('ul,ol');
            return list;
        },
        getSelectPosition: (node, _root, range) => {
            const before = range.cloneRange();
            before.selectNodeContents(node);
            before.setEnd(range.startContainer, range.startOffset);
            return { start: before.toString().length };
        },
        setRangeByWbr: (node, range) => {
            const marker = node.querySelector('wbr');
            assert.ok(marker, 'caret marker survives normalization');
            range.setStartBefore(marker);
            range.collapse(true);
            marker.remove();
            w.getSelection().removeAllRanges();
            w.getSelection().addRange(range);
        },
        afterRenderEvent() {}, processAfterRender() {}, highlightToolbar() {},
        recordHistoryChange() {}, recordHistoryPosition() {},
    });
    w.eval(code);
    w.eval(normalizerCode);
    const vditor = { lute, currentMode: 'wysiwyg', wysiwyg: { element } };
    function caret(text) {
        const walker = w.document.createTreeWalker(element, w.NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) if (node.textContent.trim() === text) break;
        assert.ok(node, `find ${text}`);
        const range = w.document.createRange();
        range.setStart(node, 0);
        range.collapse(true);
        return range;
    }
    function key(text, key, shiftKey = false) {
        const range = caret(text);
        const event = new w.KeyboardEvent('keydown', { key, shiftKey, cancelable: true });
        const p = closest(range.startContainer, 'p');
        const result = w.handlers.fixList(range, vditor, p, event);
        assert.equal(result, true);
        assert.equal(event.defaultPrevented, true);
        assert.ok(element.contains(range.startContainer), 'caret remains in editor');
        return range;
    }
    return { w, lute, element, vditor, caret, key, md: () => lute.VditorDOM2Md(element.innerHTML), close: () => w.close() };
}

const nested = '- Parent\n    - Child\n        - Grandchild\n            - Great-grandchild\n    - Next\n        - Next child\n- Tail\n';

test('outdent moves a subtree once and keeps following siblings nested', () => {
    const f = fixture(nested);
    f.key('Child', 'Tab', true);
    assert.equal(f.md(), '- Parent\n- Child\n  - Grandchild\n    - Great-grandchild\n  - Next\n    - Next child\n- Tail\n');
    assert.equal(f.element.querySelectorAll('li').length, 7);
    f.close();
});

test('Backspace at first nested item outdents without losing descendants', () => {
    const f = fixture(nested);
    f.key('Child', 'Backspace');
    assert.equal(f.md(), '- Parent\n- Child\n  - Grandchild\n    - Great-grandchild\n  - Next\n    - Next child\n- Tail\n');
    assert.equal(f.element.querySelectorAll('p ul,p ol,p p,h1,h2').length, 0);
    f.close();
});

test('Backspace at top-level item preserves block boundaries and remaining list', () => {
    const f = fixture('- Parent\n\n  Paragraph\n\n  - Child\n    - Grandchild\n- Tail\n');
    f.key('Parent', 'Backspace');
    assert.equal(f.element.querySelectorAll('p p,p ul,p ol').length, 0);
    assert.match(f.md(), /^Parent\n\nParagraph\n\n- Child\n  - Grandchild\n\n- Tail\n$/);
    f.close();
});

test('top-level tight item keeps inline formatting and child list as separate blocks', () => {
    const f = fixture('- Parent **bold**\n  - Child\n');
    f.key('Parent', 'Backspace');
    assert.equal(f.element.querySelectorAll('p ul,p ol').length, 0);
    assert.equal(f.md(), 'Parent **bold**\n\n- Child\n');
    f.close();
});

test('mixed ordered/unordered subtree survives outdent and parser round-trip', () => {
    const f = fixture('1. Parent\n   - Child\n     1. Grandchild\n        - Deep\n   - Next\n2. Tail\n');
    f.key('Child', 'Backspace');
    const result = f.md();
    assert.equal((result.match(/Grandchild/g) || []).length, 1);
    assert.equal((result.match(/Deep/g) || []).length, 1);
    assert.equal(f.lute.VditorDOM2Md(f.lute.Md2VditorDOM(result)), result);
    assert.equal(f.element.querySelectorAll('li').length, 6);
    f.close();
});

test('Tab can create fourth and fifth nesting levels when a preceding sibling exists', () => {
    const f = fixture('- One\n  - Two\n    - Three\n    - Four\n    - Five\n');
    f.key('Four', 'Tab');
    f.key('Five', 'Tab');
    f.key('Five', 'Tab');
    assert.equal(f.md(), '- One\n  - Two\n    - Three\n      - Four\n        - Five\n');
    assert.equal(f.element.querySelectorAll('ul ul ul ul ul li').length, 1);
    f.close();
});

test('task list descendants retain checkbox state through outdent', () => {
    const f = fixture('- [ ] Parent\n  - [x] Child\n    - [ ] Grandchild\n  - [x] Next\n');
    const li = f.element.querySelector('li li');
    f.w.handlers.listOutdent(f.vditor, li, f.caret('Child'), f.element.firstElementChild);
    assert.equal(f.element.querySelectorAll('input').length, 4);
    assert.equal(f.element.querySelectorAll('input[checked]').length, 2);
    assert.equal((f.md().match(/Grandchild/g) || []).length, 1);
    f.close();
});

test('outdent of an only child removes its empty source list', () => {
    const f = fixture('- Parent\n  - Child\n    - Grandchild\n');
    f.key('Child', 'Backspace');
    assert.equal(f.md(), '- Parent\n- Child\n  - Grandchild\n');
    assert.equal(f.element.querySelectorAll('ul:empty,ol:empty').length, 0);
    f.close();
});

test('repeated Backspace outdents one level at a time and keeps the caret valid', () => {
    const f = fixture('- Parent\n  - Child\n    - Grandchild\n');
    f.key('Grandchild', 'Backspace');
    assert.equal(f.md(), '- Parent\n  - Child\n  - Grandchild\n');
    // The sibling now has a previous item: Shift+Tab remains the explicit outdent.
    f.key('Grandchild', 'Tab', true);
    assert.equal(f.md(), '- Parent\n  - Child\n- Grandchild\n');
    f.close();
});

test('unlisting a plain first item leaves following items intact', () => {
    const f = fixture('- First\n- Second\n');
    f.key('First', 'Backspace');
    assert.equal(f.md(), 'First\n\n- Second\n');
    f.close();
});

function emptyFirstChild(f, filler = '<br>', marker = '-') {
    f.element.innerHTML = `<ul data-marker="-"><li data-marker="-">Parent<ul data-marker="${marker}"><li data-marker="${marker}">${filler}</li><li data-marker="${marker}"><wbr>Child</li></ul></li></ul>`;
}

for (const filler of ['', '<br>', '\n', '\u200b', '<p><br></p>', '<wbr><br>']) {
    test(`empty first nested dash remains a list through repeated normalization and save/reload: ${JSON.stringify(filler)}`, () => {
        const f = fixture('');
        emptyFirstChild(f, filler);
        f.w.normalizeLists(f.element);
        const once = f.element.innerHTML;
        f.w.normalizeLists(f.element);
        assert.equal(f.element.innerHTML, once, 'normalizer is idempotent');
        for (let i = 0; i < 3; i++) {
            f.element.innerHTML = f.lute.SpinVditorDOM(f.element.innerHTML);
            assert.equal(f.element.querySelectorAll('h1,h2,h3,h4,h5,h6').length, 0);
            assert.equal(f.element.querySelectorAll('li').length, 3);
            const md = f.md();
            assert.equal(md, '- Parent\n\n  - \n  - Child\n');
            f.element.innerHTML = f.lute.Md2VditorDOM(md);
            assert.equal(f.element.querySelectorAll('h1,h2,h3,h4,h5,h6').length, 0);
            assert.equal(f.element.querySelectorAll('li').length, 3);
        }
        f.close();
    });
}

test('unprotected empty nested dash reproduces Setext heading corruption', () => {
    const f = fixture('');
    emptyFirstChild(f);
    f.element.innerHTML = f.lute.SpinVditorDOM(f.element.innerHTML);
    assert.equal(f.element.querySelector('h2')?.textContent, 'Parent');
    assert.equal(f.element.querySelectorAll('li').length, 2, 'empty child was consumed as underline');
    f.close();
});

test('normalization preserves inline markup and the caret node', () => {
    const f = fixture('');
    emptyFirstChild(f);
    const parent = f.element.querySelector('li');
    parent.firstChild.replaceWith(f.w.document.createTextNode('Before '));
    const strong = f.w.document.createElement('strong');
    strong.textContent = 'Parent';
    parent.insertBefore(strong, parent.querySelector('ul'));
    const marker = f.element.querySelector('wbr');
    f.w.normalizeLists(f.element);
    assert.equal(f.element.querySelector('wbr'), marker);
    assert.equal(f.element.querySelector('strong'), strong);
    assert.equal(parent.firstElementChild.tagName, 'P');
    assert.match(f.md(), /^- Before \*\*Parent\*\*\n\n/);
    f.close();
});

test('normalization leaves nonempty items, other markers, tasks and HTML previews untouched', () => {
    const f = fixture('');
    for (const [marker, filler] of [['-', 'Text'], ['-', '<input type="checkbox">'], ['*', '<br>'], ['+', '<br>']]) {
        emptyFirstChild(f, filler, marker);
        const before = f.element.innerHTML;
        f.w.normalizeLists(f.element);
        assert.equal(f.element.innerHTML, before);
    }
    emptyFirstChild(f);
    f.element.innerHTML = `<div class="vditor-wysiwyg__preview">${f.element.innerHTML}</div>`;
    const before = f.element.innerHTML;
    f.w.normalizeLists(f.element);
    assert.equal(f.element.innerHTML, before);
    f.close();
});

test('existing intentional headings are not rewritten', () => {
    const f = fixture('');
    emptyFirstChild(f);
    const parent = f.element.querySelector('li');
    const heading = f.w.document.createElement('h2');
    heading.textContent = 'Parent';
    parent.firstChild.replaceWith(heading);
    const before = f.element.innerHTML;
    f.w.normalizeLists(f.element);
    assert.equal(f.element.innerHTML, before);
    f.close();
});

test('deep empty dash children preserve every ancestor and child on save/reload', () => {
    const f = fixture('');
    emptyFirstChild(f);
    f.element.innerHTML = `<ul data-marker="-"><li data-marker="-">Outer${f.element.innerHTML}</li></ul>`;
    f.w.normalizeLists(f.element);
    const md = f.md();
    f.element.innerHTML = f.lute.Md2VditorDOM(md);
    assert.equal(f.element.querySelectorAll('h1,h2,h3,h4,h5,h6').length, 0);
    assert.equal(f.element.querySelectorAll('li').length, 4);
    assert.match(md, /Outer/);
    assert.match(md, /Parent/);
    assert.match(md, /Child/);
    f.close();
});

for (const [prefix, suffix] of [['', 'Child'], ['Chi', 'ld'], ['Child', '']]) {
    test(`Backspace joins native Enter split at ${prefix.length} with descendants`, () => {
        const f = fixture('- Parent\n  - Child\n    - Grandchild\n  - Next\n- Tail\n');
        const child = f.caret('Child').startContainer.parentElement;
        const previous = f.w.document.createElement('li');
        previous.setAttribute('data-marker', '-');
        previous.textContent = prefix || '\u200b';
        child.before(previous);
        child.firstChild.textContent = suffix || '\u200b';
        const range = f.w.document.createRange();
        range.setStart(child.firstChild, 0);
        range.collapse(true);
        // The real history code inserts then removes a caret span, splitting
        // text nodes. A retained childNodes array must not lose the new suffix.
        f.w.recordHistoryPosition = () => {
            const marker = f.w.document.createElement('span');
            range.insertNode(marker);
            marker.remove();
        };
        // recordFirstPosition can also leave a logically empty selection.
        const marker = f.w.document.createElement('span');
        range.insertNode(marker);
        marker.remove();
        const event = new f.w.KeyboardEvent('keydown', {key:'Backspace',cancelable:true});
        assert.equal(f.w.handlers.fixList(range, f.vditor, false, event), true);
        assert.equal(event.defaultPrevented, true);
        assert.equal(f.md(), '- Parent\n  - Child\n    - Grandchild\n  - Next\n- Tail\n');
        const text = f.w.document.createTextNode('X');
        range.insertNode(text);
        assert.match(f.md(), new RegExp(`${prefix}X${suffix}`));
        assert.equal(f.element.querySelectorAll('li').length, 5);
        f.close();
    });
}

test('joining split item preserves inline markup and ordered child list', () => {
    const f = fixture('- Before\n- **After**\n  1. Child\n');
    f.key('After', 'Backspace');
    assert.equal(f.md(), '- Before**After**\n  1. Child\n');
    f.close();
});

test('Backspace keeps an image-only previous item', () => {
    const f = fixture('- ![picture](https://example.com/image.png)\n- Child\n  - Grandchild\n');
    f.key('Child', 'Backspace');
    assert.equal(f.element.querySelectorAll('img').length, 1);
    assert.match(f.md(), /!\[picture\]\(https:\/\/example.com\/image.png\)Child/);
    f.close();
});

test('Backspace leaves multiple label paragraphs to normal block handling', () => {
    const f = fixture('- Previous\n- Child\n\n  Second paragraph\n\n  - Grandchild\n');
    const before = f.element.innerHTML;
    const range = f.caret('Child');
    const event = new f.w.KeyboardEvent('keydown', {key:'Backspace',cancelable:true});
    f.w.handlers.fixList(range, f.vditor, range.startContainer.parentElement, event);
    assert.equal(event.defaultPrevented, false);
    assert.equal(f.element.innerHTML, before);
    f.close();
});
