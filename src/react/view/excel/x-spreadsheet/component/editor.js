//* global window */
import { h } from './element';
import Suggest from './suggest';
import Datepicker from './datepicker';
import { cssPrefix } from '../config';
import { getFontSizePxByPt } from '../core/font';
import { resolveExcelCellColor } from '../../theme';
// import { mouseMoveUp } from '../event';

const FORMULA_MIN_WIDTH = 300;
const FORMULA_MIN_HEIGHT = 80;

function buildEditorFontCss(font, defaultFontName = 'Arial') {
  const sizePx = getFontSizePxByPt(font?.size ?? 11);
  const parts = [];
  if (font?.italic) parts.push('italic');
  if (font?.bold) parts.push('bold');
  parts.push(`${sizePx}px`);
  const name = (font?.name || defaultFontName).replace(/"/g, '\\"');
  parts.push(`"${name}"`);
  return parts.join(' ');
}

function resetTextareaSize() {
  const { inputText } = this;
  if (!/^\s*$/.test(inputText)) {
    const {
      textlineEl, textEl, areaOffset,
    } = this;
    const isFormula = inputText.trimStart().startsWith('=');
    const txts = inputText.split('\n');
    const maxTxtSize = Math.max(...txts.map(it => it.length));
    const tlOffset = textlineEl.offset();
    const fontWidth = tlOffset.width / inputText.length;
    const tlineWidth = (maxTxtSize + 1) * fontWidth + 5;
    const maxWidth = this.viewFn().width - areaOffset.left - fontWidth;
    let h1 = txts.length;
    if (tlineWidth > areaOffset.width || (isFormula && FORMULA_MIN_WIDTH > areaOffset.width)) {
      let twidth = Math.max(tlineWidth, isFormula ? FORMULA_MIN_WIDTH : 0);
      if (twidth > maxWidth) {
        twidth = maxWidth;
        h1 += parseInt(tlineWidth / maxWidth, 10);
        h1 += (tlineWidth % maxWidth) > 0 ? 1 : 0;
      }
      textEl.css('width', `${twidth}px`);
    }
    h1 *= this.rowHeight;
    const minH = isFormula ? FORMULA_MIN_HEIGHT : 0;
    if (h1 > areaOffset.height || minH > areaOffset.height) {
      textEl.css('height', `${Math.max(h1, minH)}px`);
    }
  }
}

function insertText({ target }, itxt) {
  const { value, selectionEnd } = target;
  const ntxt = `${value.slice(0, selectionEnd)}${itxt}${value.slice(selectionEnd)}`;
  target.value = ntxt;
  target.setSelectionRange(selectionEnd + 1, selectionEnd + 1);

  this.inputText = ntxt;
  this.textlineEl.html(ntxt);
  resetTextareaSize.call(this);
}

function keydownEventHandler(evt) {
  const { keyCode, altKey } = evt;
  if (keyCode !== 13 && keyCode !== 9) evt.stopPropagation();
  // macOS Option key inserts special symbols; allow Option+Enter for newline only
  if (altKey && keyCode !== 13) {
    evt.preventDefault();
    return;
  }
  if (keyCode === 13 && altKey) {
    insertText.call(this, evt, '\n');
    evt.stopPropagation();
  }
  if (keyCode === 13 && !altKey) evt.preventDefault();
  // 不知道为什么单元格事件被吞了, Windows上正常
  if (evt.metaKey && navigator.userAgent.includes('Mac OS')) {
    const newEvent = new evt.constructor(evt.type, evt);
    document.body.dispatchEvent(newEvent);
  }
}

function inputEventHandler(evt) {
  const v = evt.target.value;
  // console.log(evt, 'v:', v);
  const { suggest, textlineEl, validator } = this;
  const { cell } = this;
  if (cell !== null) {
    if (('editable' in cell && cell.editable === true) || (cell.editable === undefined)) {
      this.inputText = v;
      if (validator) {
        if (validator.type === 'list') {
          suggest.search(v);
        } else {
          suggest.hide();
        }
      } else {
        const start = v.lastIndexOf('=');
        if (start !== -1) {
          suggest.search(v.substring(start + 1));
        } else {
          suggest.hide();
        }
      }
      textlineEl.html(v);
      resetTextareaSize.call(this);
      this.change('input', v);
    } else {
      evt.target.value = cell.text || '';
    }
  } else {
    this.inputText = v;
    if (validator) {
      if (validator.type === 'list') {
        suggest.search(v);
      } else {
        suggest.hide();
      }
    } else {
      const start = v.lastIndexOf('=');
      if (start !== -1) {
        suggest.search(v.substring(start + 1));
      } else {
        suggest.hide();
      }
    }
    textlineEl.html(v);
    resetTextareaSize.call(this);
    this.change('input', v);
  }
}

function setTextareaRange(position) {
  const { el } = this.textEl;
  setTimeout(() => {
    el.focus();
    el.setSelectionRange(position, position);
  }, 0);
}

function setText(text, position) {
  const { textEl, textlineEl } = this;
  // firefox bug
  textEl.el.blur();

  textEl.val(text);
  textlineEl.html(text);
  setTextareaRange.call(this, position);
}

function suggestItemClick(it) {
  const { inputText, validator } = this;
  let position = 0;
  if (validator && validator.type === 'list') {
    this.inputText = it;
    position = this.inputText.length;
  } else {
    const start = inputText.lastIndexOf('=');
    const sit = inputText.substring(0, start + 1);
    let eit = inputText.substring(start + 1);
    if (eit.indexOf(')') !== -1) {
      eit = eit.substring(eit.indexOf(')'));
    } else {
      eit = '';
    }
    this.inputText = `${sit + it.key}(`;
    // console.log('inputText:', this.inputText);
    position = this.inputText.length;
    this.inputText += `)${eit}`;
  }
  setText.call(this, this.inputText, position);
}

function resetSuggestItems() {
  this.suggest.setItems(this.formulas);
}

function dateFormat(d) {
  let month = d.getMonth() + 1;
  let date = d.getDate();
  if (month < 10) month = `0${month}`;
  if (date < 10) date = `0${date}`;
  return `${d.getFullYear()}-${month}-${date}`;
}

export default class Editor {
  constructor(formulas, viewFn, rowHeight) {
    this.viewFn = viewFn;
    this.rowHeight = rowHeight;
    this.formulas = formulas;
    this.suggest = new Suggest(formulas, (it) => {
      suggestItemClick.call(this, it);
    });
    this.datepicker = new Datepicker();
    this.datepicker.change((d) => {
      // console.log('d:', d);
      this.setText(dateFormat(d));
      this.clear();
    });
    this.areaEl = h('div', `${cssPrefix}-editor-area`)
      .children(
        this.textEl = h('textarea', '')
          .on('input', evt => inputEventHandler.call(this, evt))
          .on('paste.stop', () => { })
          .on('keydown', evt => keydownEventHandler.call(this, evt)),
        this.textlineEl = h('div', 'textline'),
        this.suggest.el,
        this.datepicker.el,
      )
      .on('mousemove.stop', () => { })
      .on('mousedown.stop', () => { });
    this.el = h('div', `${cssPrefix}-editor`)
      .child(this.areaEl).hide();
    this.suggest.bindInputEvents(this.textEl);

    this.areaOffset = null;
    this.freeze = { w: 0, h: 0 };
    this.cell = null;
    this.inputText = '';
    this.change = () => { };
  }

  setFreezeLengths(width, height) {
    this.freeze.w = width;
    this.freeze.h = height;
  }

  clear() {
    // const { cell } = this;
    // const cellText = (cell && cell.text) || '';
    if (this.inputText !== '') {
      this.change('finished', this.inputText);
    }
    this.cell = null;
    this.areaOffset = null;
    this.inputText = '';
    this.el.hide();
    this.textEl.val('');
    this.textlineEl.html('');
    resetSuggestItems.call(this);
    this.datepicker.hide();
  }

  setOffset(offset, suggestPosition = 'top') {
    const {
      textEl, areaEl, suggest, freeze, el,
    } = this;
    if (offset) {
      this.areaOffset = offset;
      const {
        left, top, width, height, l, t,
      } = offset;
      const elOffset = { left: 0, top: 0 };
      if (freeze.w > l && freeze.h > t) {
        //
      } else if (freeze.w < l && freeze.h < t) {
        elOffset.left = freeze.w;
        elOffset.top = freeze.h;
      } else if (freeze.w > l) {
        elOffset.top = freeze.h;
      } else if (freeze.h > t) {
        elOffset.left = freeze.w;
      }
      el.offset(elOffset);
      // TODO: Width and height
      areaEl.offset({ left: left - elOffset.left - 0.8, top: top - elOffset.top - 0.8 });
      textEl.offset({ width: width - 9 + 0.8 - 12, height: height - 3 + 0.8 - 5 });
      const sOffset = { left: 0 };
      sOffset[suggestPosition] = height;
      suggest.setOffset(sOffset);
      suggest.hide();
    }
  }

  setCell(cell, validator, cellStyle) {
    if (cell && cell.editable === false) return;

    // console.log('::', validator);
    const { el, datepicker, suggest } = this;
    el.show();
    this.cell = cell;
    const text = (cell && cell.text) || '';
    this.setText(text);
    if (cellStyle) {
      this.applyCellStyle(cellStyle);
    }

    this.validator = validator;
    if (validator) {
      const { type } = validator;
      if (type === 'date') {
        datepicker.show();
        if (!/^\s*$/.test(text)) {
          datepicker.setValue(text);
        }
      }
      if (type === 'list') {
        suggest.setItems(validator.values());
        suggest.search('');
      }
    }
  }

  setText(text) {
    this.inputText = text;
    // console.log('text>>:', text);
    setText.call(this, text, text.length);
    resetTextareaSize.call(this);
  }

  applyCellStyle(cellStyle) {
    const { textEl, textlineEl } = this;
    if (!cellStyle) return;
    const font = cellStyle.font;
    if (font) {
      const fontCss = buildEditorFontCss(font);
      const lineHeight = `${getFontSizePxByPt(font.size ?? 11) + 2}px`;
      textEl.css('font', fontCss);
      textEl.css('line-height', lineHeight);
      textlineEl.css('font', fontCss);
      textlineEl.css('line-height', lineHeight);
    }
    const color = resolveExcelCellColor(cellStyle.color);
    textEl.css('color', color);
    textlineEl.css('color', color);
  }
}
