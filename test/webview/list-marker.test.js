'use strict';

/**
 * Webview 集成测试 — 列表 marker 聚焦可编辑（resource/markdown/list-marker.js）
 *
 * 移植自 hardened 仓库 tests/integration/list-marker.js（25 项契约），按本仓库适配：
 * - 加载真实构建产物（vditor/dist/index.min.js + lute）
 * - 模块经 window.eval 注入页面上下文（模块内部直接使用 document/window）
 * - 事件必须派发到 wysiwyg.element（.vditor-wysiwyg .vditor-reset），
 *   它是 .vditor-wysiwyg 容器的子元素，派发到父容器事件到不了监听器
 * - jsdom 需补 innerText polyfill（vditor 的 wysiwyg input 管线
 *   调 blockElement.innerText.startsWith）
 *
 * 分组：
 * - R/L：Lute 引擎语义栅栏（对无模块的现状即应通过——引擎语义前置验证）
 * - G：monkey-patch 闸门黑盒（span 绝不泄漏进 markdown）
 * - E：聚焦激活 / 重编号 / 升格段落
 * - U：undo 快照干净度（vditor undo 栈存 innerHTML，恢复绕过闸门，
 *   依赖 selectionchange 清扫 + 保存路径闸门兜底）
 * - C：CSS 契约（resource/markdown/index.css）
 *
 * 前置：需先构建 vditor 子包（vditor/dist 不入库）。未构建时整组跳过。
 */

const { describe, it, before } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');
const { TextDecoder, TextEncoder } = require('node:util');
const { webcrypto } = require('node:crypto');

const ROOT = path.join(__dirname, '..', '..');
const DIST = path.join(ROOT, 'vditor', 'dist');
const MODULE_PATH = path.join(ROOT, 'resource', 'markdown', 'list-marker.js');
const CSS_PATH = path.join(ROOT, 'resource', 'markdown', 'index.css');

const MD = '1. first\n2. second\n\n- alpha\n- beta\n';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const DIST_READY = fs.existsSync(path.join(DIST, 'index.min.js'))
  && fs.existsSync(path.join(DIST, 'js', 'lute', 'lute.min.js'));

const fileUrl = (p) => 'file://' + p.replace(/\\/g, '/');

/**
 * 以真实构建产物启动编辑器。返回 { window, document }。
 * 所有外部依赖（lute、i18n）预 eval 并以选项/桩短路加载器。
 */
async function boot(content) {
  const virtualConsole = new VirtualConsole();
  const pageErrors = [];
  virtualConsole.on('jsdomError', (err) => pageErrors.push(String(err)));

  const dom = new JSDOM('<!DOCTYPE html><html><head></head><body><div id="app"></div></body></html>', {
    runScripts: 'dangerously',
    resources: 'usable',
    url: fileUrl(path.join(ROOT, '__list-marker-test__.html')),
    pretendToBeVisual: true,
    virtualConsole,
  });
  const { window } = dom;
  const { document } = window;

  window.TextDecoder = TextDecoder;
  window.TextEncoder = TextEncoder;
  window.crypto = webcrypto;
  if (typeof window.fetch === 'undefined') {
    window.fetch = () => Promise.reject(new Error('fetch stub'));
  }
  if (typeof document.execCommand !== 'function') {
    document.execCommand = function () { return true; };
  }
  // jsdom 未实现 innerText；vditor 的 wysiwyg input 处理器会调用
  // blockElement.innerText.startsWith(...)，缺此 polyfill 会抛错
  if (!('innerText' in window.HTMLElement.prototype)) {
    Object.defineProperty(window.HTMLElement.prototype, 'innerText', {
      configurable: true,
      get() { return this.textContent; },
      set(v) { this.textContent = v; },
    });
  }
  window.HTMLElement.prototype.scrollIntoView = function () { };

  // vditor 的 CodeMirror 懒挂载在构造时创建 IntersectionObserver；jsdom 未实现。
  // 测试文档无代码块，观察器无需真实回调
  window.IntersectionObserver = class {
    constructor() { }
    observe() { }
    unobserve() { }
    disconnect() { }
    takeRecords() { return []; }
  };

  // vditor 的 editorTheme Auto 检测调用 prefers-color-scheme；jsdom 无 matchMedia
  window.matchMedia = window.matchMedia || ((q) => ({
    matches: false, media: q, onchange: null,
    addListener() { }, removeListener() { },
    addEventListener() { }, removeEventListener() { },
    dispatchEvent() { return false; },
  }));

  // 预载 Lute 并短路 vditor 的脚本加载器（addScript 以元素 id 去重）
  window.eval(fs.readFileSync(path.join(DIST, 'js', 'lute', 'lute.min.js'), 'utf8'));
  const stubScript = (id) => {
    const s = document.createElement('script');
    s.id = id;
    document.head.appendChild(s);
  };
  stubScript('vditorLuteScript');

  // 预载 i18n，经 options.i18n 直传（constructor 的 i18n 分支免脚本加载）
  window.eval(fs.readFileSync(path.join(DIST, 'js', 'i18n', 'en_US.js'), 'utf8'));
  const i18n = window.VditorI18n;

  window.eval(fs.readFileSync(path.join(DIST, 'index.min.js'), 'utf8'));
  if (typeof window.Vditor === 'undefined') {
    throw new Error('Vditor did not load');
  }

  let booted = false;
  window.vditor = new window.Vditor('app', {
    value: content,
    mode: 'wysiwyg',
    lang: 'en_US',
    i18n,
    cdn: fileUrl(path.join(ROOT, 'vditor')),
    height: '600px',
    cache: { enable: false },
    toolbar: [],
    after() { booted = true; },
  });

  for (let i = 0; i < 60; i++) {
    await sleep(250);
    if (booted
      && window.vditor.getCurrentMode && window.vditor.getCurrentMode() === 'wysiwyg'
      && document.querySelector('.vditor-wysiwyg .vditor-reset')) {
      return { window, document };
    }
  }
  throw new Error('editor did not boot; page errors: ' + pageErrors.join(' | ').slice(0, 2000));
}

/** 将光标放进文本节点的 offset 处并通知 selectionchange（jsdom 不会自动派发） */
function setCaret(window, document, node, offset) {
  const sel = window.getSelection();
  const range = document.createRange();
  range.setStart(node, offset);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
  document.dispatchEvent(new window.Event('selectionchange'));
}

function fireInput(window, target) {
  target.dispatchEvent(new window.InputEvent('input', { bubbles: true, inputType: 'insertText', data: 'x' }));
}

function fireKey(window, document, key, opts = {}) {
  document.dispatchEvent(new window.KeyboardEvent('keydown', {
    key, bubbles: true, cancelable: true, ...opts,
  }));
}

const liveSpan = (doc, li) => (li ? li.querySelector(':scope > span.vmd-li-marker') : null);

/** vditor 把 input 监听挂在 wysiwyg.element（.vditor-wysiwyg 内的 .vditor-reset） */
const editorElOf = (document) =>
  document.querySelector('.vditor-wysiwyg .vditor-reset')
  || document.querySelector('.vditor-wysiwyg');

// ── R/L：Lute 引擎语义栅栏 ────────────────────────────────────────────────

describe('list-marker: Lute engine semantics fence (R/L)', { skip: DIST_READY ? false : 'vditor/dist 未构建：先在 vditor/ 目录执行构建' }, () => {
  let ctx;
  before(async () => {
    ctx = await boot(MD);
  });

  it('R1: vditor.vditor.lute.SpinVditorDOM is a function', () => {
    const lute = ctx.window.vditor.vditor.lute;
    assert.equal(typeof lute.SpinVditorDOM, 'function');
  });

  it('R2: vditor.vditor.lute.VditorDOM2Md is a function', () => {
    const lute = ctx.window.vditor.vditor.lute;
    assert.equal(typeof lute.VditorDOM2Md, 'function');
  });

  it('L1: unordered first-li marker change is followed by spin', () => {
    const lute = ctx.window.vditor.vditor.lute;
    const uFollow = lute.SpinVditorDOM('<ul data-block="0" data-marker="-"><li data-marker="*">a</li></ul>');
    assert.match(uFollow, /<ul[^>]*data-marker="\*/);
    assert.match(uFollow, /<li[^>]*data-marker="\*/);
  });

  it('L2: mixed unordered markers split into two lists', () => {
    const lute = ctx.window.vditor.vditor.lute;
    const uSplit = lute.SpinVditorDOM('<ul data-block="0" data-marker="-"><li data-marker="-">a</li><li data-marker="*">b</li></ul>');
    assert.equal((uSplit.match(/<ul/g) || []).length, 2);
  });

  it('L3: ordered start survives spin', () => {
    const lute = ctx.window.vditor.vditor.lute;
    const oKeep = lute.SpinVditorDOM('<ol data-block="0" start="5" data-marker="5."><li data-marker="5.">five</li></ol>');
    assert.match(oKeep, /start="5"/);
    assert.match(oKeep, /data-marker="5\."/);
  });

  it('L4: ordered start round-trips to markdown', () => {
    const lute = ctx.window.vditor.vditor.lute;
    const rt = lute.VditorDOM2Md('<ol data-block="0" start="5" data-marker="5."><li data-marker="5.">five</li><li data-marker="6.">six</li></ol>');
    assert.equal(rt, '5. five\n6. six\n');
  });

  it('L5: paren-delimited list stays separate from dot list', () => {
    const lute = ctx.window.vditor.vditor.lute;
    const sep = lute.VditorDOM2Md(lute.Md2VditorDOM('1. a\n\n5) five\n'));
    assert.equal(sep, '1. a\n\n5) five\n');
  });
});

// ── G/E/U：模块行为契约 ──────────────────────────────────────────────────

describe('list-marker: live marker module contract (G/E/U)', { skip: DIST_READY ? false : 'vditor/dist 未构建：先在 vditor/ 目录执行构建' }, () => {
  let ctx;
  before(async () => {
    ctx = await boot(MD);
    // 注入被测模块（缺失即本组全红：TDD 红相位）
    const moduleSource = fs.readFileSync(MODULE_PATH, 'utf8');
    ctx.window.eval(moduleSource);
    ctx.window.ListMarkerLive.install(ctx.window.vditor);
  });

  it('G1: SpinVditorDOM strips marker span and folds value into attributes', () => {
    const lute = ctx.window.vditor.vditor.lute;
    const withSpan = '<ol data-block="0" data-marker="1."><li data-marker="1.">'
      + '<span class="vmd-li-marker">5.\u00A0</span>first</li></ol>';
    const spun = lute.SpinVditorDOM(withSpan);
    assert.ok(!spun.includes('vmd-li-marker'), spun.replace(/\n/g, ''));
    assert.match(spun, /data-marker="5\."/);
    assert.match(spun, /start="5"/);
  });

  it('G2: VditorDOM2Md output has no span text and keeps edited start', () => {
    const lute = ctx.window.vditor.vditor.lute;
    const withSpan = '<ol data-block="0" data-marker="1."><li data-marker="1.">'
      + '<span class="vmd-li-marker">5.\u00A0</span>first</li></ol>';
    const asMd = lute.VditorDOM2Md(withSpan);
    assert.ok(!asMd.includes('vmd-li-marker'));
    assert.ok(!asMd.includes('\u00A0'));
    assert.equal(asMd, '5. first\n');
  });

  it('E1: caret in list line shows live marker span', async () => {
    const { window, document } = ctx;
    const li = document.querySelector('.vditor-wysiwyg ol li');
    setCaret(window, document, li.firstChild, 2);
    await sleep(60);
    const span = liveSpan(document, li);
    assert.ok(span, 'no live span appeared');
    assert.equal(span.textContent, '1.\u00A0');
    assert.ok(li.classList.contains('vmd-marker-live'));
  });

  it('E2: caret move swaps live span to the new line (no stale span)', async () => {
    const { window, document } = ctx;
    const firstLi = document.querySelector('.vditor-wysiwyg ol li');
    const secondLi = document.querySelectorAll('.vditor-wysiwyg ol li')[1];
    setCaret(window, document, secondLi.firstChild, 2);
    await sleep(60);
    assert.ok(!liveSpan(document, firstLi), 'stale span on previous line');
    const s2 = liveSpan(document, secondLi);
    assert.ok(s2);
    assert.equal(s2.textContent, '2.\u00A0');
  });

  it('E3: editing "1." to "5." renumbers the list (markdown + DOM, no leakage)', async () => {
    const { window, document } = ctx;
    const li = document.querySelector('.vditor-wysiwyg ol li');
    setCaret(window, document, li.firstChild, 2);
    await sleep(60);
    const span = liveSpan(document, li);
    assert.ok(span, 'no live span (E1 failed)');
    span.textContent = '5.\u00A0';
    setCaret(window, document, span.firstChild, span.firstChild.textContent.length);
    fireInput(window, editorElOf(document));
    await sleep(600); // vditor undoDelay 默认 600ms + 余量
    const value = window.vditor.getValue();
    assert.ok(value.startsWith('5. first'), JSON.stringify(value));
    assert.ok(value.includes('6. second'), JSON.stringify(value));
    const ol = document.querySelector('.vditor-wysiwyg ol');
    assert.equal(ol.getAttribute('start'), '5');
    assert.ok(!value.includes('vmd-li-marker'));
    assert.ok(!value.includes('\u00A0'));
  });

  it('E4: editing "-" to "*" changes bullet char', async () => {
    const { window, document } = ctx;
    const li = document.querySelector('.vditor-wysiwyg ul li'); // alpha
    setCaret(window, document, li.firstChild, 2);
    await sleep(60);
    const span = liveSpan(document, li);
    assert.ok(span, 'no live span');
    span.textContent = '*\u00A0';
    setCaret(window, document, span.firstChild, span.firstChild.textContent.length);
    fireInput(window, editorElOf(document));
    await sleep(600);
    const value = window.vditor.getValue();
    assert.match(value, /(^|\n)\* alpha/, JSON.stringify(value));
    assert.doesNotMatch(value, /(^|\n)- alpha/, JSON.stringify(value));
  });

  it('E5: emptying marker lifts the line out of the list', async () => {
    const { window, document } = ctx;
    // E4 后 beta 是仅剩的 "- " 项
    const lis = document.querySelectorAll('.vditor-wysiwyg ul li');
    const beta = lis[lis.length - 1];
    setCaret(window, document, beta.firstChild, 2);
    await sleep(60);
    const span = liveSpan(document, beta);
    assert.ok(span, 'no live span');
    span.textContent = '';
    setCaret(window, document, beta, 0);
    fireKey(window, document, 'Backspace');
    await sleep(600);
    const value = window.vditor.getValue();
    assert.match(value, /(^|\n)beta/, JSON.stringify(value));
    assert.doesNotMatch(value, /[-*] beta/, JSON.stringify(value));
    const leftover = Array.from(document.querySelectorAll('.vditor-wysiwyg li'))
      .some((li) => li.textContent.replace(/\u00A0/g, ' ').trim() === 'beta');
    assert.ok(!leftover, 'lifted line still has a li');
  });


  // 逐字符 Backspace 删空 marker：span 文本删至 '' 时文本节点消失，
  // 不得因 range.setStart(null) 抛 TypeError，应直接升格段落
  it('E8: char-by-char backspace to empty lifts the item without throwing', async () => {
    const { window, document } = ctx;
    const li = document.querySelector('.vditor-wysiwyg ol li');
    setCaret(window, document, li.firstChild, 2);
    await sleep(60);
    const span = liveSpan(document, li);
    assert.ok(span, 'no live span');
    span.textContent = '5'; // 已删到只剩一个字符
    setCaret(window, document, span.firstChild, 1);
    fireKey(window, document, 'Backspace');
    await sleep(600);
    const value = window.vditor.getValue();
    assert.match(value, /(^|\n)first/, JSON.stringify(value));
    assert.doesNotMatch(value, /5\. first/, JSON.stringify(value));
  });

  // IME composition 期间的 input/keydown（isComposing）不得被模块拦截：
  // 否则输入法确认 Enter 被吞、composition 会话被 commitSpan 销毁。
  // 透传后 vditor 会真实处理事件并重绘 DOM，用独立 boot 隔离
  it('E9: composition events are never intercepted (isComposing guard)', async () => {
    const b5 = await boot(MD);
    const { window: w, document: d } = b5;
    try {
      w.eval(fs.readFileSync(MODULE_PATH, 'utf8'));
      w.ListMarkerLive.install(w.vditor);
      const editorEl = editorElOf(d);

      // 透传的 Enter 会让 vditor 拆项重绘，li 集合不可预测：
      // 自适应选第一个内容非空的 li，光标放到其文本末尾
      const focusSpanInFirstLi = async () => {
        const lis = Array.from(d.querySelectorAll('.vditor-wysiwyg ol li'));
        const li = lis.find((l) => l.textContent.trim());
        assert.ok(li, 'no list item with content');
        // 拆项后可能是松散结构（li > p），走真实文本节点而非 li.firstChild
        const walker = d.createTreeWalker(li, 4 /* SHOW_TEXT */);
        let textNode = null;
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          if (n.textContent.trim()) { textNode = n; break; }
        }
        assert.ok(textNode, 'no text node in li');
        setCaret(w, d, textNode, Math.min(2, textNode.textContent.length));
        await sleep(60);
        const span = liveSpan(d, li);
        assert.ok(span, 'no live span');
        setCaret(w, d, span.firstChild, 1);
        return li;
      };

      // 1) keydown（IME 确认 Enter）
      const li = await focusSpanInFirstLi();
      let keyReached = false;
      const keyProbe = () => { keyReached = true; };
      editorEl.addEventListener('keydown', keyProbe, false);
      const keyEvt = new w.KeyboardEvent('keydown', {
        key: 'Enter', bubbles: true, cancelable: true,
      });
      // jsdom 的 KeyboardEvent init 不支持 isComposing，派发前注入
      Object.defineProperty(keyEvt, 'isComposing', { value: true });
      li.dispatchEvent(keyEvt);
      editorEl.removeEventListener('keydown', keyProbe, false);
      assert.strictEqual(keyReached, true, 'IME-confirm Enter was swallowed by the module');

      // 2) input（composition 文本插入；vditor 透传处理可能重绘，重新取节点）
      await focusSpanInFirstLi();
      let inputReached = false;
      const inputProbe = () => { inputReached = true; };
      editorEl.addEventListener('input', inputProbe, false);
      const inputEvt = new w.InputEvent('input', {
        bubbles: true, cancelable: true, inputType: 'insertCompositionText', data: '拼', isComposing: true,
      });
      editorElOf(d).dispatchEvent(inputEvt);
      editorEl.removeEventListener('input', inputProbe, false);
      assert.strictEqual(inputReached, true, 'composition input was swallowed by the module');
    } finally {
      b5.window.close();
    }
  });

  // 光标在正文（非 marker span 内）时，行上仍持有 live span（ensureLive 无条件建），
  // 但按键必须透传给 vditor——拦截条件是“光标在 span 内”而非“行上有 span”。
  // 事件需派发到真实 target（li 元素，冒泡），派发到 document 不会下沉。
  // 透传后 vditor 会真实处理按键并重绘 DOM，用独立 boot 隔离
  it('E7: Enter/Space pass through when caret is in item CONTENT (not in marker span)', async () => {
    const b6 = await boot(MD);
    const { window: w, document: d } = b6;
    try {
      w.eval(fs.readFileSync(MODULE_PATH, 'utf8'));
      w.ListMarkerLive.install(w.vditor);

      const li = d.querySelector('.vditor-wysiwyg ol li');
      assert.ok(li, 'no list item');
      // 先触发聚焦（span 建立），再把光标放回正文文本节点（span 之后的兄弟）
      setCaret(w, d, li.firstChild, 2);
      await sleep(60);
      const span = liveSpan(d, li);
      assert.ok(span, 'no live span (precondition)');
      const contentNode = span.nextSibling;
      assert.ok(contentNode && contentNode.nodeType === 3, 'no content text node after span');
      setCaret(w, d, contentNode, 1);

      const editorEl = editorElOf(d);
      for (const key of [' ', 'Enter']) {
        let reachedEditor = false;
        const probe = () => { reachedEditor = true; };
        editorEl.addEventListener('keydown', probe, false);
        const evt = new w.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
        const notCancelled = li.dispatchEvent(evt);
        editorEl.removeEventListener('keydown', probe, false);
        // 注：vditor 当前对普通 li 的正文 Enter 不 preventDefault（fixList 仅拦多 P 场景），
        // 因此 defaultPrevented 可完全归因于模块；若 vditor 未来改变此行为需调整断言
        assert.strictEqual(notCancelled, true, `module preventDefault'd content "${key}"`);
        assert.strictEqual(reachedEditor, true, `content "${key}" never reached the editor element (vditor handlers)`);
      }
    } finally {
      b6.window.close();
    }
  });

  // 任务列表项 li.vditor-task 也带 data-marker（与 checkbox 布局耦合），
  // marker 编辑明确不做（issue #1）：模块不得在任务行激活、CSS 不得画重复标记
  it('E6: task-list items never activate (checkbox layout untouched)', async () => {
    const MD_TASK = '1. first\n\n- [x] done\n- [ ] todo\n';
    const b3 = await boot(MD_TASK);
    const { window: w, document: d } = b3;
    try {
      w.eval(fs.readFileSync(MODULE_PATH, 'utf8'));
      w.ListMarkerLive.install(w.vditor);

      const taskLi = d.querySelector('.vditor-wysiwyg li.vditor-task');
      assert.ok(taskLi, 'no task item rendered');
      assert.ok(taskLi.hasAttribute('data-marker'), 'task li has no data-marker; revisit guard');

      setCaret(w, d, taskLi.firstChild, 0);
      await sleep(60);
      assert.ok(!liveSpan(d, taskLi), 'live span appeared inside a task item');
      assert.equal(d.querySelectorAll('.vditor-wysiwyg .vmd-li-marker').length, 0,
        'stray marker spans after focusing a task item');

      const value = w.vditor.getValue();
      assert.ok(/- \[[xX]\] done/.test(value), JSON.stringify(value));
      assert.ok(/- \[ \] todo/.test(value), JSON.stringify(value));
    } finally {
      b3.window.close();
    }
  });

  // vditor undo 栈存 innerHTML 快照；undo 需 ≥2 条目，marker 编辑前先做一次普通编辑
  it('U0-U2: undo restores pre-marker-edit markdown without span leakage', async () => {
    const MD_U = '1. first\n2. second\n\npara\n';
    const MD_U_TYPED = '1. first\n2. second\n\nparaX\n';
    const b2 = await boot(MD_U);
    const { window: w, document: d } = b2;
    try {
      // 模块按 window 安装（监听器挂在各自 document 上）：第二窗口需重新注入
      w.eval(fs.readFileSync(MODULE_PATH, 'utf8'));
      w.ListMarkerLive.install(w.vditor);

      // 1) 普通编辑：para 结尾输入 X（建立栈）
      const para = d.querySelector('.vditor-wysiwyg p');
      assert.ok(para, 'no paragraph');
      para.firstChild.textContent = 'paraX';
      setCaret(w, d, para.firstChild, 5);
      editorElOf(d).dispatchEvent(new w.InputEvent('input', { bubbles: true, inputType: 'insertText', data: 'X' }));
      await sleep(1200);

      // 2) marker 编辑：1. → 7.
      const li = d.querySelector('.vditor-wysiwyg ol li');
      setCaret(w, d, li.firstChild, 2);
      await sleep(60);
      const span = liveSpan(d, li);
      assert.ok(span, 'no live span appeared');
      span.textContent = '7.\u00A0';
      setCaret(w, d, span.firstChild, span.firstChild.textContent.length);
      editorElOf(d).dispatchEvent(new w.InputEvent('input', { bubbles: true, inputType: 'insertText', data: 'x' }));
      await sleep(1200); // undoDelay 期间快照可能仍含 span——契约是恢复后干净
      assert.ok(w.vditor.getValue().startsWith('7. first'), 'renumber not applied');

      // 直调 undo 栈（Ctrl+Z 在有 undo 工具栏按钮时被跳过；契约是快照/恢复干净度）
      w.vditor.vditor.undo.undo(w.vditor.vditor);
      await sleep(300);
      const v = w.vditor.getValue();
      assert.equal(v, MD_U_TYPED, JSON.stringify(v));
      assert.ok(!v.includes('vmd-li-marker'), 'span class leaked into undo-restored markdown');
      assert.ok(!v.includes('\u00A0'), 'nbsp leaked into undo-restored markdown');
    } finally {
      b2.window.close();
    }
  });
});

// ── C：CSS 契约 ──────────────────────────────────────────────────────────

describe('list-marker: CSS contract (C)', () => {
  let css;
  before(() => {
    css = fs.readFileSync(CSS_PATH, 'utf8');
  });

  it('C1: native markers hidden for data-block lists', () => {
    assert.match(css, /ol\[data-block\][^{}]*\{[^}]*list-style:\s*none/);
    assert.match(css, /ul\[data-block\][^{}]*\{[^}]*list-style:\s*none/);
  });

  it('C2: li::before renders marker from attr (task items excluded)', () => {
    assert.match(css, /li\[data-marker\]:not\(\.vditor-task\):?:before[^{]*\{[^}]*attr\(data-marker\)/);
  });

  it('C3: live-line class and span styled', () => {
    assert.match(css, /vmd-marker-live/);
    assert.match(css, /vmd-li-marker/);
  });

  it('C4: marker color follows the list-marker color variable', () => {
    assert.match(css, /data-marker\][^{]*:?:before[^}]*--list-marker-color/);
  });
  it('C5: live span mirrors the ::before box model (no focus jitter)', () => {
    // 聚焦时 span 接管 ::before，两者占位须一致，否则正文起点跳动
    assert.match(css, /\.vmd-li-marker[^{]*\{[^}]*display:\s*inline-block/);
    assert.match(css, /\.vmd-li-marker[^{]*\{[^}]*min-width:\s*1\.5em/);
    assert.match(css, /\.vmd-li-marker[^{]*\{[^}]*margin-left:\s*-1\.8em/);
  });
});

// ── W：接线契约 ──────────────────────────────────────────────────────────

describe('list-marker: wiring contract (W)', () => {
  it('W1: index.html loads list-marker.js before index.js', () => {
    const html = fs.readFileSync(path.join(ROOT, 'resource', 'markdown', 'index.html'), 'utf8');
    const lm = html.indexOf('list-marker.js');
    assert.ok(lm > 0, 'list-marker.js script tag missing');
    assert.ok(html.indexOf('index.js') > lm, 'list-marker.js must load before index.js');
  });

  it('W2: index.js installs the module in after()', () => {
    const js = fs.readFileSync(path.join(ROOT, 'resource', 'markdown', 'index.js'), 'utf8');
    assert.match(js, /ListMarkerLive\.install\(editor\)/);
  });
});
