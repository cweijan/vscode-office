import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {buildSync} from 'esbuild';
import puppeteer from 'puppeteer-core';

const bundle = (entry, name) => buildSync({entryPoints: [entry], bundle: true, write: false,
    format: 'iife', globalName: name, define: {VDITOR_VERSION: '"test"'}}).outputFiles[0].text;

test('wikilink boundaries preserve outside typing and paragraph breaks', async () => {
    const browser = await puppeteer.launch({executablePath: process.env.CHROME_PATH
        || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true});
    try {
        const page = await browser.newPage();
        await page.setContent('<div id="editor" class="vditor-reset" contenteditable="true"></div>');
        await page.addScriptTag({content: readFileSync('test/output/lute/lute.min.js', 'utf8')});
        await page.addScriptTag({content: bundle('vditor/src/ts/util/wikilinkBoundary.ts', 'Boundary')});
        await page.addScriptTag({content: bundle('vditor/src/ts/ir/expandMarker.ts', 'Markers')});
        await page.evaluate(() => {
            window.lute = Lute.New();
            lute.SetObsidian(true);
            Boundary.bindWikilinkBoundary(document.querySelector('#editor'));
        });
        for (const mode of ['DOM', 'IRDOM']) {
            for (const syntax of ['[[Note]]', '![[Note]]', '[[Note|Alias]]']) {
                for (const side of ['before', 'after']) {
                    await page.evaluate(({mode, syntax, side}) => {
                        const editor = document.querySelector('#editor');
                        editor.innerHTML = lute['Md2Vditor' + mode](syntax);
                        editor.focus();
                        const link = editor.querySelector('[data-type]');
                        link.classList.add('vditor-ir__node--expand');
                        const text = (side === 'before' ? link.firstChild : link.lastChild).firstChild;
                        const range = new Range();
                        range.setStart(text, side === 'before' ? 0 : text.length);
                        range.collapse(true);
                        getSelection().removeAllRanges();
                        getSelection().addRange(range);
                    }, {mode, syntax, side});
                    await page.keyboard.type('x');
                    const result = await page.evaluate(({mode}) => {
                        const editor = document.querySelector('#editor');
                        const range = getSelection().getRangeAt(0);
                        const assertOutside = !editor.querySelector('[data-type]').contains(range.startContainer);
                        range.insertNode(document.createElement('wbr'));
                        const spun = lute['SpinVditor' + mode](editor.innerHTML);
                        return {outside: assertOutside, spun, md: lute['Vditor' + mode + '2Md'](spun).trim()};
                    }, {mode});
                    assert.equal(result.outside, true, JSON.stringify({mode, syntax, side, result}));
                    assert.match(result.spun, /<wbr>/);
                    assert.equal(result.md, side === 'before' ? 'x' + syntax : syntax + 'x');
                    await page.keyboard.press('Enter');
                    const markdown = await page.evaluate(mode => lute['Vditor' + mode + '2Md'](
                        lute['SpinVditor' + mode](document.querySelector('#editor').innerHTML)), mode);
                    assert.equal(markdown.split(syntax).length - 1, 1, markdown);
                }
            }
        }
        for (const mode of ['DOM', 'IRDOM']) {
            for (const markdown of ['[[Note]]', '- [[Note]]']) {
                await page.evaluate(({mode, markdown}) => {
                    const editor = document.querySelector('#editor');
                    editor.innerHTML = lute['Md2Vditor' + mode](markdown);
                    editor.focus();
                    const text = editor.querySelector('[data-type="wikilink"]').lastChild.firstChild;
                    const range = new Range();
                    range.setStart(text, text.length);
                    range.collapse(true);
                    getSelection().removeAllRanges();
                    getSelection().addRange(range);
                }, {mode, markdown});
                await page.keyboard.press('Enter');
                const result = await page.evaluate(mode => {
                    const editor = document.querySelector('#editor');
                    const spun = lute['SpinVditor' + mode](editor.innerHTML);
                    return lute['Vditor' + mode + '2Md'](spun);
                }, mode);
                assert.equal(result.split('[[Note]]').length - 1, 1, result);
            }
        }
        await page.evaluate(() => {
            const editor = document.querySelector('#editor');
            editor.innerHTML = lute.Md2VditorDOM('[[Note]]tail');
            const tail = editor.firstChild.lastChild;
            const range = new Range();
            range.setStart(tail, 0);
            range.collapse(true);
            Markers.expandMarker(range, editor);
            window.adjacentCaretStayedOutside = range.startContainer === tail;
        });
        assert.equal(await page.evaluate(() => adjacentCaretStayedOutside), true);
    } finally {
        await browser.close();
    }
});
