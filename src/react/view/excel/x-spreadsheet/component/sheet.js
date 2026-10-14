/* global window */
import { h } from './element';
import {
  bind,
  mouseMoveUp,
  createEventEmitter,
} from './event';
import Resizer from './resizer';
import Scrollbar from './scrollbar';
import Selector from './selector';
import Editor from './editor';
import Print from './print';
import ContextMenu from './contextmenu';
import Table from './table';
import Toolbar from './toolbar/index';
import FormulaBar from './formula_bar';
import ModalValidation from './modal_validation';
import ModalHyperlink from './modal_hyperlink';
import SortFilter from './sort_filter';
import SheetImages from './sheet_images';
import { xtoast } from './message';
import { cssPrefix } from '../config';
import { formulaMenuItems } from '../core/formula';
import { CellRange } from '../core/cell_range';
import { expr2xy, xy2expr } from '../core/alphabet';

const SCROLL_EXPAND_THRESHOLD = 40;
const HYPERLINK_CLICK_THRESHOLD = 5;
const VIEW_EXPAND_COOLDOWN_MS = 250;
const WHEEL_ZOOM_STEP = 0.1;
const WHEEL_ZOOM_THROTTLE_MS = 300;

function tryExpandRows(sheet, data) {
  const now = Date.now();
  if (now - (sheet._lastRowExpandAt || 0) < VIEW_EXPAND_COOLDOWN_MS) return false;
  if (!data.expandViewRows()) return false;
  sheet._lastRowExpandAt = now;
  return true;
}

function tryExpandCols(sheet, data) {
  if (sheet._horizontalExpandConsumed) return false;
  if (!data.expandViewCols()) return false;
  sheet._horizontalExpandConsumed = true;
  return true;
}

function isAtRightEdge(sheet) {
  const { data } = sheet;
  const { width } = sheet.getTableOffset();
  const contentWidth = data.cols.totalWidth();
  const { left } = sheet.horizontalScrollbar.scroll();
  const maxLeft = Math.max(0, contentWidth - width);
  if (contentWidth <= width) {
    const viewRange = data.viewRange();
    return viewRange.eci >= data.cols.len - 2;
  }
  return left >= maxLeft - SCROLL_EXPAND_THRESHOLD;
}

function updateHorizontalExpandArmed(sheet) {
  const { data } = sheet;
  const { width } = sheet.getTableOffset();
  const contentWidth = data.cols.totalWidth();
  const { left } = sheet.horizontalScrollbar.scroll();
  const maxLeft = Math.max(0, contentWidth - width);
  if (left < maxLeft - SCROLL_EXPAND_THRESHOLD) {
    sheet._horizontalExpandConsumed = false;
  }
}

function expandColsOnHorizontalRelease(sheet) {
  updateHorizontalExpandArmed(sheet);
  if (!isAtRightEdge(sheet)) return;
  const { data, table } = sheet;
  if (!tryExpandCols(sheet, data)) return;
  horizontalScrollbarSet.call(sheet);
  table.render();
}

function checkAndExpandViewRows(sheet, scrollDy = 0) {
  const { data, table } = sheet;
  const { height } = sheet.getTableOffset();
  let expanded = false;

  const erth = data.exceptRowTotalHeight(0, -1);
  const contentHeight = data.rows.totalHeight() - erth;
  const { top } = sheet.verticalScrollbar.scroll();
  const maxTop = Math.max(0, contentHeight - height);
  let expandRows = top >= maxTop - SCROLL_EXPAND_THRESHOLD;
  if (!expandRows && scrollDy > 0 && contentHeight <= height) {
    const viewRange = data.viewRange();
    if (viewRange.eri >= data.rows.len - 2) expandRows = true;
  }
  if (expandRows) {
    expanded = tryExpandRows(sheet, data) || expanded;
  }

  if (expanded) {
    verticalScrollbarSet.call(sheet);
    horizontalScrollbarSet.call(sheet);
    table.render();
  }
  return expanded;
}

// Wheel deltas and momentum belong to the browser. Only zoom cancels wheel events.
function overlayerMousescroll(evt) {
  if (evt.ctrlKey || evt.metaKey) overlayerMousezoom.call(this, evt);
}

function nativeScrollSet() {
  const { data } = this;
  const { width, height } = this.getRect();
  const contentHeight = data.rows.totalHeight() - data.exceptRowTotalHeight(0, -1);
  this.scrollContentEl.offset({
    width: width + Math.max(0, data.cols.totalWidth() - data.contentViewWidth()),
    height: height + Math.max(0, contentHeight - data.contentViewHeight()),
  });
  this.scrollViewportEl.offset({ width, height });
  this.overlayerEl.scroll({ left: data.scroll.x, top: data.scroll.y });
}

function nativeScrollMove() {
  const { data, table, selector, overlayerEl } = this;
  const { left, top } = overlayerEl.scroll();
  let changed = false;
  const markChanged = () => { changed = true; };
  data.scrollx(left, markChanged);
  data.scrolly(top, markChanged);
  this.horizontalScrollbar.move({ left: data.scroll.x });
  this.verticalScrollbar.move({ top: data.scroll.y });
  if (changed) {
    selector.resetAreaOffset();
    editorSetOffset.call(this);
    table.render();
    sheetImagesUpdate.call(this);
    checkAndExpandViewRows(this);
  }
}

function overlayerMousezoom(evt) {
  evt.preventDefault();
  const { data, table, editor } = this;
  const oldScale = data.getZoomScale();
  const now = Date.now();
  if (now - this.lastZoomWheelAt < WHEEL_ZOOM_THROTTLE_MS) return;
  this.lastZoomWheelAt = now;

  const direction = evt.deltaY > 0 || evt.detail > 0 ? -1 : 1;
  const nextZoom = Math.round((oldScale + direction * WHEEL_ZOOM_STEP) * 100) / 100;
  if (!data.setZoomScale(nextZoom)) return;

  editor.clear();
  // Row and column headers scale too, so move the overlays to the new grid origin.
  this.overlayerCEl.offset(this.getTableOffset());
  editor.setFreezeLengths(data.freezeTotalWidth(), data.freezeTotalHeight());
  verticalScrollbarSet.call(this);
  horizontalScrollbarSet.call(this);
  const ratio = data.getZoomScale() / oldScale;
  this.horizontalScrollbar.move({ left: data.scroll.x * ratio });
  this.verticalScrollbar.move({ top: data.scroll.y * ratio });
  table.render();
  this.selector.resetAreaOffset();
  sheetImagesUpdate.call(this);
}

function scrollbarMove() {
  const {
    data, verticalScrollbar, horizontalScrollbar,
  } = this;
  const {
    l, t, left, top, width, height,
  } = data.getSelectedRect();
  const tableOffset = this.getTableOffset();
  // console.log(',l:', l, ', left:', left, ', tOffset.left:', tableOffset.width);
  if (Math.abs(left) + width > tableOffset.width) {
    horizontalScrollbar.move({ left: l + width - tableOffset.width });
  } else {
    const fsw = data.freezeTotalWidth();
    if (left < fsw) {
      horizontalScrollbar.move({ left: l - 1 - fsw });
    }
  }
  // console.log('top:', top, ', height:', height, ', tof.height:', tableOffset.height);
  if (Math.abs(top) + height > tableOffset.height) {
    verticalScrollbar.move({ top: t + height - tableOffset.height - 1 });
  } else {
    const fsh = data.freezeTotalHeight();
    if (top < fsh) {
      verticalScrollbar.move({ top: t - 1 - fsh });
    }
  }
}

function selectorSet(multiple, ri, ci, indexesUpdated = true, moving = false) {
  const {
    table, selector, toolbar, data,
    contextMenu,
  } = this;
  const cell = data.getCell(ri, ci);
  if (multiple) {
    selector.setEnd(ri, ci, moving);
    this.trigger('cells-selected', cell, selector.range);
  } else {
    // trigger click event
    selector.set(ri, ci, indexesUpdated);
    this.trigger('cell-selected', cell, ri, ci);
  }
  contextMenu.setMode((ri === -1 || ci === -1) ? 'row-col' : 'range');
  this.formulaBar.update();
  toolbar.reset();
  table.render();
}

function cellHasSelectionContent(cell) {
  if (!cell) return false;
  return ['text', 'value', 'formula'].some((key) => {
    const value = cell[key];
    return value !== undefined && value !== null && `${value}` !== '';
  });
}

function rowHasSelectionContent(data, ri, sci, eci) {
  for (let ci = sci; ci <= eci; ci += 1) {
    if (cellHasSelectionContent(data.rows.getCell(ri, ci))) return true;
  }
  return false;
}

function colHasSelectionContent(data, ci, sri, eri) {
  for (let ri = sri; ri <= eri; ri += 1) {
    if (cellHasSelectionContent(data.rows.getCell(ri, ci))) return true;
  }
  return false;
}

function findParentSelectionRange(data) {
  const { range } = data.selector;
  let {
    sri, sci, eri, eci,
  } = range;
  const maxRi = data.rows.len - 1;
  const maxCi = data.cols.len - 1;
  sri = Math.max(0, sri);
  sci = Math.max(0, sci);
  eri = Math.min(maxRi, eri);
  eci = Math.min(maxCi, eci);

  let changed = true;
  while (changed) {
    changed = false;
    if (sri > 0 && rowHasSelectionContent(data, sri - 1, sci, eci)) {
      sri -= 1;
      changed = true;
    }
    if (eri < maxRi && rowHasSelectionContent(data, eri + 1, sci, eci)) {
      eri += 1;
      changed = true;
    }
    if (sci > 0 && colHasSelectionContent(data, sci - 1, sri, eri)) {
      sci -= 1;
      changed = true;
    }
    if (eci < maxCi && colHasSelectionContent(data, eci + 1, sri, eri)) {
      eci += 1;
      changed = true;
    }
  }

  const parentRange = new CellRange(sri, sci, eri, eci);
  return parentRange.contains(range) && !parentRange.equals(range) ? parentRange : null;
}

function selectorSetRange(cellRange) {
  const {
    table, selector, toolbar, data,
    contextMenu,
  } = this;
  const cell = data.getCell(cellRange.sri, cellRange.sci);
  selector.set(cellRange.sri, cellRange.sci);
  if (cellRange.multiple()) {
    selector.setEnd(cellRange.eri, cellRange.eci, false);
    this.trigger('cells-selected', cell, selector.range);
  } else {
    this.trigger('cell-selected', cell, cellRange.sri, cellRange.sci);
  }
  contextMenu.setMode('range');
  this.formulaBar.update();
  toolbar.reset();
  table.render();
}

function selectAllCells(preferParentRange = false) {
  const parentRange = preferParentRange ? findParentSelectionRange(this.data) : null;
  if (parentRange) {
    selectorSetRange.call(this, parentRange);
  } else {
    selectorSet.call(this, false, -1, -1);
  }
}

function isFormulaReferenceSelecting(sheet) {
  return !!(sheet.formulaEditTarget && sheet.editor.cell !== null);
}

function rangeToFormulaReference(range) {
  const { sri, sci, eri, eci } = range;
  const start = xy2expr(sci, sri);
  const end = xy2expr(eci, eri);
  return start === end ? start : `${start}:${end}`;
}

function normalizeFormulaRef(ref) {
  return ref.replace(/\$/g, '').toUpperCase();
}

function parseFormulaReference(text) {
  if (!/^=/.test(text || '')) return null;
  const refRegex = /\$?[A-Z]{1,3}\$?\d+(?::\$?[A-Z]{1,3}\$?\d+)?/ig;
  const match = refRegex.exec(text);
  if (!match) return null;
  const [startRef, endRef = startRef] = match[0].split(':').map(normalizeFormulaRef);
  try {
    const [sci, sri] = expr2xy(startRef);
    const [eci, eri] = expr2xy(endRef);
    if ([sri, sci, eri, eci].some(v => Number.isNaN(v) || v < 0)) return null;
    return {
      range: new CellRange(
        Math.min(sri, eri),
        Math.min(sci, eci),
        Math.max(sri, eri),
        Math.max(sci, eci),
      ),
      textStart: match.index,
      textEnd: match.index + match[0].length,
    };
  } catch (e) {
    return null;
  }
}

function formulaCursorPosition(text) {
  if (!/^=/.test(text || '')) return null;
  const parsed = parseFormulaReference(text);
  if (parsed) return parsed.textEnd;
  const openIndex = text.indexOf('(');
  if (openIndex >= 0) return openIndex + 1;
  return null;
}

function updateFormulaReferenceSelection(sheet) {
  if (!isFormulaReferenceSelecting(sheet)) return;
  sheet.editor.setFormulaReference(rangeToFormulaReference(sheet.selector.range));
}

function finishFormulaReferenceSelection(sheet) {
  sheet.formulaEditTarget = null;
  sheet.selector.el.removeClass('formula-reference-mode');
  sheet.editor.setFormulaTargetActive(false);
}

function setEditSnapshot(sheet, ri, ci, text) {
  sheet.editSnapshot = { ri, ci, text };
}

function clearEditSnapshot(sheet) {
  sheet.editSnapshot = null;
}

function cancelCellEdit(sheet) {
  const { data, editor, table } = sheet;
  const snapshot = sheet.editSnapshot;
  const target = snapshot || sheet.formulaEditTarget;
  if (!target) return false;
  if (snapshot) {
    data.setCellText(snapshot.ri, snapshot.ci, snapshot.text, 'input');
  }
  finishFormulaReferenceSelection(sheet);
  clearEditSnapshot(sheet);
  editor.cancel();
  selectorSet.call(sheet, false, target.ri, target.ci);
  table.render();
  return true;
}

function restoreFormulaReferenceSelection(sheet, targetRi, targetCi, formulaText) {
  const parsed = parseFormulaReference(formulaText);
  if (!parsed) return false;
  const { data, editor, selector, table } = sheet;
  const { range, textStart, textEnd } = parsed;
  sheet.formulaEditTarget = { ri: targetRi, ci: targetCi };
  data.selector.setIndexes(range.sri, range.sci);
  selector.set(range.sri, range.sci);
  selector.setEnd(range.eri, range.eci, false);
  selector.el.addClass('formula-reference-mode');
  editor.setFormulaTargetActive(true);
  editor.setFormulaReferenceRange(textStart, textEnd);
  editor.setCursorPosition(textEnd);
  table.render();
  return true;
}

// multiple: boolean
// direction: left | right | up | down | row-first | row-last | col-first | col-last
function selectorMove(multiple, direction) {
  const {
    selector, data,
  } = this;
  const { rows, cols } = data;
  let [ri, ci] = selector.indexes;
  const { eri, eci } = selector.range;
  if (multiple) {
    [ri, ci] = selector.moveIndexes;
  }
  // console.log('selector.move:', ri, ci);
  if (direction === 'left') {
    if (ci > 0) ci -= 1;
  } else if (direction === 'right') {
    if (eci !== ci) ci = eci;
    if (ci < cols.len - 1) ci += 1;
  } else if (direction === 'up') {
    if (ri > 0) ri -= 1;
  } else if (direction === 'down') {
    if (eri !== ri) ri = eri;
    if (ri < rows.len - 1) ri += 1;
  } else if (direction === 'row-first') {
    ci = 0;
  } else if (direction === 'row-last') {
    ci = cols.len - 1;
  } else if (direction === 'col-first') {
    ri = 0;
  } else if (direction === 'col-last') {
    ri = rows.len - 1;
  }
  if (multiple) {
    selector.moveIndexes = [ri, ci];
  }
  selectorSet.call(this, multiple, ri, ci);
  scrollbarMove.call(this);
}

// private methods
function overlayerOffset(sheet, evt) {
  const overRect = sheet.overlayerEl.box();
  return {
    offsetX: evt.clientX - overRect.left,
    offsetY: evt.clientY - overRect.top,
  };
}

function overlayerMousemove(evt) {
  // console.log('x:', evt.offsetX, ', y:', evt.offsetY);
  if (evt.buttons !== 0) return;
  if (evt.target.className === `${cssPrefix}-resizer-hover`) return;
  const { offsetX, offsetY } = overlayerOffset(this, evt);
  const {
    rowResizer, colResizer, tableEl, data,
  } = this;
  const { rows, cols } = data;
  const cRect = data.getCellRectByXY(offsetX, offsetY);
  if (offsetX > cols.indexWidth && offsetY > rows.height) {
    rowResizer.hide();
    colResizer.hide();
    if (cRect.ri >= 0 && cRect.ci >= 0 && data.getHyperlink(cRect.ri, cRect.ci)) {
      this.overlayerEl.el.style.cursor = 'pointer';
    } else {
      this.overlayerEl.el.style.cursor = '';
    }
    return;
  }
  this.overlayerEl.el.style.cursor = '';
  const tRect = tableEl.box();
  if (cRect.ri >= 0 && cRect.ci === -1) {
    cRect.width = cols.indexWidth;
    cRect.height = rows.getHeight(cRect.ri);
    rowResizer.show(cRect, {
      width: tRect.width,
    });
    if (rows.isHide(cRect.ri - 1)) {
      rowResizer.showUnhide(cRect.ri);
    } else {
      rowResizer.hideUnhide();
    }
  } else {
    rowResizer.hide();
  }
  if (cRect.ri === -1 && cRect.ci >= 0) {
    cRect.height = rows.height;
    colResizer.show(cRect, {
      height: tRect.height,
    });
    if (cols.isHide(cRect.ci - 1)) {
      colResizer.showUnhide(cRect.ci);
    } else {
      colResizer.hideUnhide();
    }
  } else {
    colResizer.hide();
  }
}

function verticalScrollbarSet() {
  const { data, verticalScrollbar } = this;
  const { height } = this.getTableOffset();
  const erth = data.exceptRowTotalHeight(0, -1);
  // console.log('erth:', erth);
  verticalScrollbar.set(height, data.rows.totalHeight() - erth);
  nativeScrollSet.call(this);
}

function horizontalScrollbarSet() {
  const { data, horizontalScrollbar } = this;
  const { width } = this.getTableOffset();
  if (data) {
    horizontalScrollbar.set(width, data.cols.totalWidth());
    nativeScrollSet.call(this);
  }
}

function sheetFreeze() {
  const {
    selector, data, editor,
  } = this;
  const [ri, ci] = data.freeze;
  if (ri > 0 || ci > 0) {
    const fwidth = data.freezeTotalWidth();
    const fheight = data.freezeTotalHeight();
    editor.setFreezeLengths(fwidth, fheight);
  }
  selector.resetAreaOffset();
}

function sheetImagesUpdate() {
  this.sheetImages.updatePositions(this.data);
}

function sheetReset() {
  const {
    tableEl,
    overlayerEl,
    overlayerCEl,
    table,
    toolbar,
    selector,
    sheetImages,
    el,
  } = this;
  const tOffset = this.getTableOffset();
  const vRect = this.getRect();
  tableEl.attr(vRect);
  overlayerEl.offset(vRect);
  overlayerCEl.offset(tOffset);
  el.css('width', `${vRect.width}px`);
  verticalScrollbarSet.call(this);
  horizontalScrollbarSet.call(this);
  sheetFreeze.call(this);
  table.render();
  this.sheetImages.setEditable(this.data.settings.mode !== 'read');
  this.sheetImages.reset(this.data);
  toolbar.reset();
  selector.reset();
}

function clearClipboard() {
  const { data, selector } = this;
  data.clearClipboard();
  selector.hideClipboard();
}

function copy(evt) {
  const { data, selector } = this;
  if (data.settings.mode === 'read') return;
  data.copy();
  data.copyToSystemClipboard(evt);
  selector.showClipboard();
}

function cut() {
  const { data, selector } = this;
  if (data.settings.mode === 'read') return;
  data.cut();
  selector.showClipboard();
}

function paste(what, evt) {
  const { data } = this;
  if (data.settings.mode === 'read') return;
  if (data.clipboard.isClear()) {
    if (evt) {
      const html = what === 'all' ? evt.clipboardData.getData('text/html') : '';
      if (html && this.data.pasteFromHtml(html)) {
        sheetReset.call(this);
        return;
      }
      const cdata = evt.clipboardData.getData('text/plain');
      this.data.pasteFromText(cdata);
      sheetReset.call(this);
      return;
    }
    const resetSheet = () => sheetReset.call(this);
    const eventTrigger = (rows) => {
      this.trigger('pasted-clipboard', rows);
    };
    data.pasteFromSystemClipboard(resetSheet, eventTrigger);
  } else if (data.paste(what, msg => xtoast('Tip', msg))) {
    sheetReset.call(this);
  } else if (evt) {
    const html = what === 'all' ? evt.clipboardData.getData('text/html') : '';
    if (html && this.data.pasteFromHtml(html)) {
      sheetReset.call(this);
      return;
    }
    const cdata = evt.clipboardData.getData('text/plain');
    this.data.pasteFromText(cdata);
    sheetReset.call(this);
  }
}

function hideRowsOrCols() {
  this.data.hideRowsOrCols();
  sheetReset.call(this);
}

function unhideRowsOrCols(type, index) {
  this.data.unhideRowsOrCols(type, index);
  sheetReset.call(this);
}

function autofilter() {
  const { data } = this;
  data.autofilter();
  sheetReset.call(this);
}

function toolbarChangePaintformatPaste() {
  const { toolbar } = this;
  if (toolbar.paintformatActive()) {
    paste.call(this, 'format');
    clearClipboard.call(this);
    toolbar.paintformatToggle();
  }
}

function hideHeaderDropIndicator(sheet) {
  sheet.headerDropEl.hide();
}

function showRowHeaderDropIndicator(sheet, insertAt) {
  const { data, headerDropEl } = sheet;
  const range = new CellRange(insertAt, 0, insertAt, Math.max(0, data.cols.len - 1));
  const rect = data.getRect(range);
  const tableOffset = sheet.getTableOffset();
  headerDropEl
    .attr('data-axis', 'row')
    .css('width', `${rect.width}px`)
    .css('height', '2px')
    .offset({
      left: tableOffset.left + rect.left,
      top: tableOffset.top + rect.top,
    })
    .show();
}

function showColHeaderDropIndicator(sheet, insertAt) {
  const { data, headerDropEl } = sheet;
  const range = new CellRange(0, insertAt, Math.max(0, data.rows.len - 1), insertAt);
  const rect = data.getRect(range);
  const tableOffset = sheet.getTableOffset();
  headerDropEl
    .attr('data-axis', 'col')
    .css('width', '2px')
    .css('height', `${rect.height}px`)
    .offset({
      left: tableOffset.left + rect.left,
      top: tableOffset.top + rect.top,
    })
    .show();
}

function resolveRowInsertAt(data, offsetY, fallbackRi) {
  const probeX = data.cols.indexWidth + 4;
  const rect = data.getCellRectByXY(probeX, offsetY);
  if (rect.ri < 0) return fallbackRi;
  const { top, height } = rect;
  if (offsetY < top + height / 2) return rect.ri;
  return Math.min(rect.ri + 1, data.rows.len);
}

function resolveColInsertAt(data, offsetX, fallbackCi) {
  const probeY = data.rows.height + 4;
  const rect = data.getCellRectByXY(offsetX, probeY);
  if (rect.ci < 0) return fallbackCi;
  const { left, width } = rect;
  if (offsetX < left + width / 2) return rect.ci;
  return Math.min(rect.ci + 1, data.cols.len);
}

function beginHeaderRowDrag(sheet, evt, hitRi) {
  const { data, selector } = sheet;
  if (data.settings.mode === 'read') return false;
  let { sri, eri } = selector.range;
  if (hitRi < sri || hitRi > eri) {
    selectorSet.call(sheet, false, hitRi, -1);
    sri = hitRi;
    eri = hitRi;
  }
  const dragFrom = { sri, eri };
  const startY = evt.clientY;
  let dragging = false;
  let insertAt = sri;
  const overRect = sheet.overlayerEl.el.getBoundingClientRect();
  mouseMoveUp(window, (e) => {
    if (!dragging && Math.abs(e.clientY - startY) > 4) dragging = true;
    if (!dragging) return;
    const offsetY = e.clientY - overRect.top;
    insertAt = resolveRowInsertAt(data, offsetY, dragFrom.sri);
    showRowHeaderDropIndicator(sheet, insertAt);
  }, () => {
    hideHeaderDropIndicator(sheet);
    if (!dragging) {
      selectorSet.call(sheet, false, hitRi, -1);
      return;
    }
    data.moveRows(dragFrom.sri, dragFrom.eri, insertAt);
    sheetReset.call(sheet);
  });
  return true;
}

function beginHeaderColDrag(sheet, evt, hitCi) {
  const { data, selector } = sheet;
  if (data.settings.mode === 'read') return false;
  let { sci, eci } = selector.range;
  if (hitCi < sci || hitCi > eci) {
    selectorSet.call(sheet, false, -1, hitCi);
    sci = hitCi;
    eci = hitCi;
  }
  const dragFrom = { sci, eci };
  const startX = evt.clientX;
  let dragging = false;
  let insertAt = sci;
  const overRect = sheet.overlayerEl.el.getBoundingClientRect();
  mouseMoveUp(window, (e) => {
    if (!dragging && Math.abs(e.clientX - startX) > 4) dragging = true;
    if (!dragging) return;
    const offsetX = e.clientX - overRect.left;
    insertAt = resolveColInsertAt(data, offsetX, dragFrom.sci);
    showColHeaderDropIndicator(sheet, insertAt);
  }, () => {
    hideHeaderDropIndicator(sheet);
    if (!dragging) {
      selectorSet.call(sheet, false, -1, hitCi);
      return;
    }
    data.moveColumns(dragFrom.sci, dragFrom.eci, insertAt);
    sheetReset.call(sheet);
  });
  return true;
}

function overlayerMousedown(evt) {
  // console.log(':::::overlayer.mousedown:', evt.detail, evt.button, evt.buttons, evt.shiftKey);
  // console.log('evt.target.className:', evt.target.className);
  const {
    selector, data, table, sortFilter, sheetImages,
  } = this;
  // Cell selection must not keep / show floating image selection.
  if (sheetImages) sheetImages.clearSelection();
  const { offsetX, offsetY } = overlayerOffset(this, evt);
  const isAutofillEl = evt.target.className === `${cssPrefix}-selector-corner`;
  const cellRect = data.getCellRectByXY(offsetX, offsetY);
  const {
    left, top, width, height,
  } = cellRect;
  let { ri, ci } = cellRect;
  if (evt.target.className === `${cssPrefix}-resizer-hover`) return;
  if (ri === -1 && ci === -1) {
    selectAllCells.call(this);
    return;
  }
  if (offsetX <= data.cols.indexWidth && ci === -1 && ri >= 0) {
    if (beginHeaderRowDrag(this, evt, ri)) return;
  }
  if (offsetY <= data.rows.height && ri === -1 && ci >= 0) {
    if (beginHeaderColDrag(this, evt, ci)) return;
  }
  let hyperlinkPress = null;
  if (!isAutofillEl && !evt.shiftKey && evt.button === 0 && ri >= 0 && ci >= 0) {
    const hl = data.getHyperlink(ri, ci);
    if (hl) {
      hyperlinkPress = {
        ri,
        ci,
        hl,
        clientX: evt.clientX,
        clientY: evt.clientY,
      };
    }
  }
  // sort or filter
  const { autoFilter } = data;
  if (autoFilter.includes(ri, ci)) {
    if (left + width - 20 < offsetX && top + height - 20 < offsetY) {
      const items = autoFilter.items(ci, (r, c) => data.rows.getCell(r, c));
      sortFilter.hide();
      sortFilter.set(ci, items, autoFilter.getFilter(ci), autoFilter.getSort(ci));
      sortFilter.setOffset({ left, top: top + height + 2 });
      return;
    }
  }

  // console.log('ri:', ri, ', ci:', ci);
  if (!evt.shiftKey) {
    // console.log('selectorSetStart:::');
    if (isAutofillEl) {
      selector.showAutofill(ri, ci);
    } else {
      selectorSet.call(this, false, ri, ci);
      updateFormulaReferenceSelection(this);
    }

    // mouse move up
    mouseMoveUp(window, (e) => {
      const { overlayerEl } = this;
      const overRect = overlayerEl.box();
      const moveOffsetX = e.clientX - overRect.left;
      const moveOffsetY = e.clientY - overRect.top;
      ({ ri, ci } = data.getCellRectByXY(moveOffsetX, moveOffsetY));
      if (isAutofillEl) {
        selector.showAutofill(ri, ci);
      } else if (e.buttons === 1 && !e.shiftKey) {
        selectorSet.call(this, true, ri, ci, true, true);
        updateFormulaReferenceSelection(this);
      }
    }, (e) => {
      if (hyperlinkPress) {
        const dx = e.clientX - hyperlinkPress.clientX;
        const dy = e.clientY - hyperlinkPress.clientY;
        if (Math.abs(dx) <= HYPERLINK_CLICK_THRESHOLD && Math.abs(dy) <= HYPERLINK_CLICK_THRESHOLD) {
          const overRect = this.overlayerEl.box();
          const endCell = data.getCellRectByXY(
            e.clientX - overRect.left,
            e.clientY - overRect.top,
          );
          if (endCell.ri === hyperlinkPress.ri && endCell.ci === hyperlinkPress.ci) {
            this.trigger('open-link', hyperlinkPress.hl);
          }
        }
        hyperlinkPress = null;
      }
      if (isAutofillEl && selector.arange && data.settings.mode !== 'read') {
        if (data.autofill(selector.arange, 'all', msg => xtoast('Tip', msg))) {
          table.render();
        }
      }
      selector.hideAutofill();
      toolbarChangePaintformatPaste.call(this);
    });
  }

  if (!isAutofillEl && evt.buttons === 1) {
    if (evt.shiftKey) {
      // console.log('shiftKey::::');
      selectorSet.call(this, true, ri, ci);
      updateFormulaReferenceSelection(this);
    }
  }
}

function editorSetOffset() {
  const { editor, data } = this;
  const sOffset = this.formulaEditTarget
    ? data.getRect(new CellRange(
      this.formulaEditTarget.ri,
      this.formulaEditTarget.ci,
      this.formulaEditTarget.ri,
      this.formulaEditTarget.ci,
    ))
    : data.getSelectedRect();
  const tOffset = this.getTableOffset();
  let sPosition = 'top';
  // console.log('sOffset:', sOffset, ':', tOffset);
  if (sOffset.top > tOffset.height / 2) {
    sPosition = 'bottom';
  }
  editor.setOffset(sOffset, sPosition);
}

function editorSet() {
  const { editor, data, selector } = this;
  if (data.settings.mode === 'read') return;
  const { ri, ci } = data.selector;
  if (!data.canEditCell(ri, ci)) return;
  const cell = data.getSelectedCell();
  const cellText = (cell && cell.text) || '';
  setEditSnapshot(this, ri, ci, cellText);
  editorSetOffset.call(this);
  editor.setCell(
    cell,
    data.getSelectedValidator(),
    data.getSelectedCellStyle(),
  );
  clearClipboard.call(this);
  selector.hideArea();
  if (!restoreFormulaReferenceSelection(this, ri, ci, cellText)) {
    const cursorPosition = formulaCursorPosition(cellText);
    if (cursorPosition !== null) {
      editor.setCursorPosition(cursorPosition);
    }
  }
}

function verticalScrollbarMove(distance) {
  this.overlayerEl.scroll({ top: distance });
  const { data, table, selector, verticalScrollbar } = this;
  data.scrolly(distance, () => {
    selector.resetBRLAreaOffset();
    editorSetOffset.call(this);
    table.render();
    sheetImagesUpdate.call(this);
  });
  if (data.scroll.y !== distance) {
    verticalScrollbar.move({ top: data.scroll.y });
  }
  checkAndExpandViewRows(this);
}

function horizontalScrollbarMove(distance) {
  this.overlayerEl.scroll({ left: distance });
  const { data, table, selector, horizontalScrollbar } = this;
  data.scrollx(distance, () => {
    selector.resetBRTAreaOffset();
    editorSetOffset.call(this);
    table.render();
    sheetImagesUpdate.call(this);
  });
  if (data.scroll.x !== distance) {
    horizontalScrollbar.move({ left: data.scroll.x });
  }
}

function rowResizerFinished(cRect, distance) {
  const { ri } = cRect;
  const {
    table, toolbar, selector, data,
  } = this;
  const { sri, eri } = selector.range;
  if (ri >= sri && ri <= eri) {
    data.setRowsHeight(sri, eri, distance);
  } else {
    data.setRowHeight(ri, distance);
  }

  toolbar.reset();
  table.render();
  selector.resetAreaOffset();
  verticalScrollbarSet.call(this);
  editorSetOffset.call(this);
  sheetImagesUpdate.call(this);
}

function colResizerFinished(cRect, distance) {
  const { ci } = cRect;
  const {
    table, toolbar, selector, data,
  } = this;
  const { sci, eci } = selector.range;
  if (ci >= sci && ci <= eci) {
    data.setColsWidth(sci, eci, distance);
  } else {
    data.setColWidth(ci, distance);
  }

  toolbar.reset();
  table.render();
  selector.resetAreaOffset();
  horizontalScrollbarSet.call(this);
  editorSetOffset.call(this);
  sheetImagesUpdate.call(this);
}

function dataSetCellText(text, state = 'finished') {
  const { data, table } = this;
  // const [ri, ci] = selector.indexes;
  if (data.settings.mode === 'read') return;
  const target = this.formulaEditTarget;
  const { ri, ci } = target || data.selector;
  if (target) {
    data.setCellText(ri, ci, text, state);
  } else {
    data.setSelectedCellText(text, state);
  }
  if (state === 'finished') {
    finishFormulaReferenceSelection(this);
    clearEditSnapshot(this);
  }
  if (state === 'finished') {
    table.render();
    this.formulaBar.update(text);
    const err = data.getValidationError(ri, ci);
    if (err) {
      this.trigger('validation-error', err);
    }
  } else {
    table.render();
    this.formulaBar.update(text);
    this.trigger('cell-edited', text, ri, ci);
  }
}

function insertDeleteRowColumn(type) {
  const { data } = this;
  if (data.settings.mode === 'read') return;
  if (type === 'insert-row') {
    data.insert('row');
  } else if (type === 'delete-row') {
    data.delete('row');
  } else if (type === 'insert-column') {
    data.insert('column');
  } else if (type === 'delete-column') {
    data.delete('column');
  } else if (type === 'delete-cell') {
    data.deleteCell();
  } else if (type === 'delete-cell-format') {
    data.deleteCell('format');
  } else if (type === 'delete-cell-text') {
    data.deleteCell('text');
  } else if (type === 'cell-printable') {
    data.setSelectedCellAttr('printable', true);
  } else if (type === 'cell-non-printable') {
    data.setSelectedCellAttr('printable', false);
  } else if (type === 'cell-editable') {
    data.setSelectedCellAttr('editable', true);
  } else if (type === 'cell-non-editable') {
    data.setSelectedCellAttr('editable', false);
  }
  clearClipboard.call(this);
  sheetReset.call(this);
}

function beginFormulaReferenceInput(formulaName) {
  const { data } = this;
  const { ri, ci } = data.selector;
  if (!data.canEditCell(ri, ci)) return;
  const oldCell = data.getSelectedCell();
  const oldText = (oldCell && oldCell.text) || '';
  const formulaText = `=${formulaName}()`;
  this.formulaEditTarget = { ri, ci };
  data.setCellText(ri, ci, formulaText, 'input');
  editorSet.call(this);
  setEditSnapshot(this, ri, ci, oldText);
  this.editor.setText(formulaText, formulaName.length + 2);
  this.selector.el.addClass('formula-reference-mode');
  this.editor.setFormulaTargetActive(true);
}

function toolbarChange(type, value) {
  const { data, toolbar, editor } = this;
  if (type === 'save') {
    if (data.settings.mode === 'read') {
      this.trigger('save-as');
      return;
    }
    this.trigger('save');
    return;
  }
  if (type === 'save-as') {
    this.trigger('save-as');
    return;
  }
  if (type === 'edit-in-vscode') {
    this.trigger('edit-in-vscode');
    return;
  }
  if (type === 'find') {
    this.trigger('find');
    return;
  }
  if (type === 'undo') {
    this.undo();
  } else if (type === 'redo') {
    this.redo();
  } else if (type === 'print') {
    this.print.preview();
  } else if (type === 'paintformat') {
    if (value === true) copy.call(this);
    else clearClipboard.call(this);
  } else if (type === 'clearformat') {
    insertDeleteRowColumn.call(this, 'delete-cell-format');
  } else if (type === 'link') {
    // link
  } else if (type === 'chart') {
    // chart
  } else if (type === 'autofilter') {
    // filter
    autofilter.call(this);
  } else if (type === 'freeze') {
    if (value) {
      const [freezeRi, freezeCi] = freezeSplitFromSelector(data);
      this.freeze(freezeRi, freezeCi);
    } else {
      this.freeze(0, 0);
    }
  } else if (type === 'formula' && !data.selector.multiple()) {
    beginFormulaReferenceInput.call(this, value);
  } else {
    data.setSelectedCellAttr(type, value);
    if (type === 'font-name' || type === 'font-size' || type === 'font-bold' || type === 'font-italic') {
      if (editor.cell) {
        editor.applyCellStyle(data.getSelectedCellStyle());
      }
    }
    sheetReset.call(this);
  }
}

function selectorIndexToFreezeSplit(index) {
  if (index === 0) return 1;
  return index;
}

function freezeSplitFromSelector(data) {
  const { ri, ci, range } = data.selector;
  const { rows, cols } = data;
  const isRowSelection = range.sri === range.eri
    && range.sci === 0
    && range.eci === cols.len - 1;
  const isColSelection = range.sci === range.eci
    && range.sri === 0
    && range.eri === rows.len - 1;
  const freezeRi = isColSelection ? 0 : selectorIndexToFreezeSplit(ri);
  const freezeCi = isRowSelection ? 0 : selectorIndexToFreezeSplit(ci);
  return [freezeRi, freezeCi];
}

function sortFilterChange(ci, order, operator, value) {
  // console.log('sort:', sortDesc, operator, value);
  this.data.setAutoFilter(ci, order, operator, value);
  sheetReset.call(this);
}

function sheetInitEvents() {
  const {
    selector,
    overlayerEl,
    rowResizer,
    colResizer,
    verticalScrollbar,
    horizontalScrollbar,
    editor,
    contextMenu,
    toolbar,
    modalValidation,
    modalHyperlink,
    sortFilter,
  } = this;
  // overlayer
  overlayerEl
    .on('mousemove', (evt) => {
      overlayerMousemove.call(this, evt);
    })
    .on('mousedown', (evt) => {
      if (!isFormulaReferenceSelecting(this)) {
        editor.clear();
      }
      contextMenu.hide();
      // the left mouse button: mousedown → mouseup → click
      // the right mouse button: mousedown → contenxtmenu → mouseup
      if (evt.buttons === 2) {
        const { offsetX, offsetY } = overlayerOffset(this, evt);
        if (this.data.xyInSelectedRect(offsetX, offsetY)) {
          contextMenu.setPosition(evt.offsetX, evt.offsetY);
        } else {
          overlayerMousedown.call(this, evt);
          contextMenu.setPosition(evt.offsetX, evt.offsetY);
        }
        evt.stopPropagation();
      } else if (evt.detail === 2) {
        const { offsetX, offsetY } = overlayerOffset(this, evt);
        const cellRect = this.data.getCellRectByXY(offsetX, offsetY);
        const { ri, ci } = cellRect;
        if (ri >= 0 && ci >= 0 && !this.data.canEditCell(ri, ci)) {
          selectorSet.call(this, false, ri, ci);
          this.trigger('protected-cell-dblclick');
          return;
        }
        const validationError = this.data.getValidationError(ri, ci);
        if (validationError) {
          selectorSet.call(this, false, ri, ci);
          this.trigger('validation-error', validationError);
        }
        editorSet.call(this);
      } else {
        overlayerMousedown.call(this, evt);
      }
    })
    .on('wheel', (evt) => {
      overlayerMousescroll.call(this, evt);
    })
    .on('mouseout', (evt) => {
      const { offsetX, offsetY } = evt;
      if (offsetY <= 0) colResizer.hide();
      if (offsetX <= 0) rowResizer.hide();
    });

  selector.inputChange = (v) => {
    dataSetCellText.call(this, v, 'input');
    editorSet.call(this);
  };

  overlayerEl.on('scroll.stop', () => nativeScrollMove.call(this));

  // toolbar change
  toolbar.change = (type, value) => toolbarChange.call(this, type, value);

  // sort filter ok
  sortFilter.ok = (ci, order, o, v) => sortFilterChange.call(this, ci, order, o, v);

  // resizer finished callback
  rowResizer.finishedFn = (cRect, distance) => {
    rowResizerFinished.call(this, cRect, distance);
  };
  colResizer.finishedFn = (cRect, distance) => {
    colResizerFinished.call(this, cRect, distance);
  };
  // resizer unhide callback
  rowResizer.unhideFn = (index) => {
    unhideRowsOrCols.call(this, 'row', index);
  };
  colResizer.unhideFn = (index) => {
    unhideRowsOrCols.call(this, 'col', index);
  };
  // scrollbar move callback
  verticalScrollbar.moveFn = (distance, evt) => {
    verticalScrollbarMove.call(this, distance, evt);
  };
  horizontalScrollbar.moveFn = (distance, evt) => {
    horizontalScrollbarMove.call(this, distance, evt);
  };
  horizontalScrollbar.el.on('mousedown', () => {
    this._horizontalScrollInteracting = true;
  });
  if (!this._horizontalScrollReleaseBound) {
    this._horizontalScrollReleaseBound = true;
    bind(window, 'mouseup', () => {
      if (!this._horizontalScrollInteracting) return;
      this._horizontalScrollInteracting = false;
      expandColsOnHorizontalRelease(this);
    });
  }
  // editor
  editor.change = (state, itext) => {
    if (state === 'cancel') {
      cancelCellEdit(this);
      return;
    }
    dataSetCellText.call(this, itext, state);
  };
  // modal validation
  modalValidation.change = (action, ...args) => {
    if (action === 'save') {
      this.data.addValidation(...args);
    } else {
      this.data.removeValidation();
    }
  };
  modalHyperlink.change = (action, ...args) => {
    if (action === 'save') {
      const [link, tooltip] = args;
      this.data.setSelectedHyperlink(link, tooltip);
      sheetReset.call(this);
    } else if (action === 'remove') {
      this.data.removeSelectedHyperlink();
      sheetReset.call(this);
    }
  };
  // contextmenu
  contextMenu.itemClick = (type) => {
    // console.log('type:', type);
    if (type === 'validation') {
      modalValidation.setValue(this.data.getSelectedValidation());
    } else if (type === 'hyperlink') {
      modalHyperlink.setValue(this.data.getSelectedHyperlink());
    } else if (type === 'copy') {
      copy.call(this);
    } else if (type === 'cut') {
      cut.call(this);
    } else if (type === 'paste') {
      paste.call(this, 'all');
    } else if (type === 'paste-value') {
      paste.call(this, 'text');
    } else if (type === 'paste-format') {
      paste.call(this, 'format');
    } else if (type === 'hide') {
      hideRowsOrCols.call(this);
    } else {
      insertDeleteRowColumn.call(this, type);
    }
  };

  bind(window, 'resize', () => {
    this.reload();
  });

  bind(window, 'click', (evt) => {
    this.focusing = overlayerEl.contains(evt.target);
  });

  bind(window, 'paste', (evt) => {
    if (!this.focusing) return;
    if (this.skipNextPaste) {
      this.skipNextPaste = false;
      evt.preventDefault();
      return;
    }
    const mode = this.pasteTextOnly ? 'text' : 'all';
    this.pasteTextOnly = false;
    paste.call(this, mode, evt);
    evt.preventDefault();
  });

  bind(window, 'copy', (evt) => {
    if (!this.focusing) return;
    if (this.editor.cell !== null) return;
    copy.call(this, evt);
    evt.preventDefault();
  });

  // for selector
  bind(window, 'keydown', (evt) => {
    if (!this.focusing) return;
    const keyCode = evt.keyCode || evt.which;
    const {
      key, ctrlKey, shiftKey, metaKey, altKey,
    } = evt;
    if (ctrlKey && metaKey) return;
    // console.log('keydown.evt: ', keyCode);
    if (ctrlKey || metaKey) {
      switch (keyCode) {
        case 65:
          if (this.editor.cell === null) {
            selectAllCells.call(this, true);
            evt.preventDefault();
          }
          break;
        case 90:
          // undo: ctrl + z
          this.undo();
          evt.preventDefault();
          break;
        case 89:
          // redo: ctrl + y
          this.redo();
          evt.preventDefault();
          break;
        case 88:
          // ctrl + x
          cut.call(this);
          evt.preventDefault();
          break;
        case 86:
          if (altKey && !shiftKey) {
            // ctrl/cmd + alt + v：仅粘贴格式
            if (!this.data.clipboard.isClear()) {
              paste.call(this, 'format');
            }
            evt.preventDefault();
          } else if (shiftKey && !altKey) {
            // ctrl/cmd + shift + v：仅粘贴值（无格式）
            if (!this.data.clipboard.isClear()) {
              paste.call(this, 'text');
              this.skipNextPaste = true;
            } else {
              this.pasteTextOnly = true;
            }
            evt.preventDefault();
          }
          break;
        default:
          break;
      }
    } else {
      // console.log('evt.keyCode:', evt.keyCode);
      switch (keyCode) {
        case 32:
          if (shiftKey) {
            // shift + space, all cells in row
            selectorSet.call(this, false, this.data.selector.ri, -1, false);
          }
          break;
        case 27: // esc
          if (cancelCellEdit(this)) {
            evt.preventDefault();
            break;
          }
          contextMenu.hide();
          clearClipboard.call(this);
          break;
        case 37: // left
          selectorMove.call(this, shiftKey, 'left');
          evt.preventDefault();
          break;
        case 38: // up
          selectorMove.call(this, shiftKey, 'up');
          evt.preventDefault();
          break;
        case 39: // right
          selectorMove.call(this, shiftKey, 'right');
          evt.preventDefault();
          break;
        case 40: // down
          selectorMove.call(this, shiftKey, 'down');
          evt.preventDefault();
          break;
        case 9: // tab
          editor.clear();
          // shift + tab => move left
          // tab => move right
          selectorMove.call(this, false, shiftKey ? 'left' : 'right');
          evt.preventDefault();
          break;
        case 13: // enter
          editor.clear();
          // shift + enter => move up
          // enter => move down
          selectorMove.call(this, false, shiftKey ? 'up' : 'down');
          evt.preventDefault();
          break;
        case 8: // backspace
          insertDeleteRowColumn.call(this, 'delete-cell-text');
          evt.preventDefault();
          break;
        default:
          break;
      }

      if (key === 'Delete') {
        insertDeleteRowColumn.call(this, 'delete-cell-text');
        evt.preventDefault();
      } else if (!altKey && ((keyCode >= 65 && keyCode <= 90)
        || (keyCode >= 48 && keyCode <= 57)
        || (keyCode >= 96 && keyCode <= 105)
        || evt.key === '='
      )) {
        dataSetCellText.call(this, evt.key, 'input');
        editorSet.call(this);
      } else if (keyCode === 113) {
        // F2
        editorSet.call(this);
      }
    }
  });
}

export default class Sheet {
  constructor(targetEl, data) {
    this.eventMap = createEventEmitter();
    this.pasteTextOnly = false;
    this.skipNextPaste = false;
    this.lastZoomWheelAt = 0;
    this.formulaEditTarget = null;
    this.editSnapshot = null;
    const { view, showToolbar, showContextmenu } = data.settings;
    this.el = h('div', `${cssPrefix}-sheet`);
    this.toolbar = new Toolbar(data, view.width, !showToolbar);
    this.formulaBar = new FormulaBar(
      data,
      text => dataSetCellText.call(this, text, 'finished'),
      text => dataSetCellText.call(this, text, 'input'),
      (ri, ci) => this.scrollToCell(ri, ci),
    );
    this.print = new Print(data);
    targetEl.children(this.toolbar.el, this.formulaBar.el, this.el, this.print.el);
    this.data = data;
    // table
    this.tableEl = h('canvas', `${cssPrefix}-table`);
    // resizer
    this.rowResizer = new Resizer(false, data.rows.height);
    this.colResizer = new Resizer(true, data.cols.minWidth);
    // scrollbar
    this.verticalScrollbar = new Scrollbar(true);
    this.horizontalScrollbar = new Scrollbar(false);
    // editor
    this.editor = new Editor(
      formulaMenuItems,
      () => this.getTableOffset(),
      data.rows.height,
    );
    // data validation
    this.modalValidation = new ModalValidation();
    this.modalHyperlink = new ModalHyperlink();
    // contextMenu
    this.contextMenu = new ContextMenu(() => this.getRect(), !showContextmenu);
    // selector
    this.selector = new Selector(data);
    this.sheetImages = new SheetImages();
    this.sheetImages.setOnChange(() => {
      this.trigger('change');
    });
    this.sheetImages.setOnSelect(() => {
      this.editor.clear();
      this.selector.hide();
    });
    this.overlayerCEl = h('div', `${cssPrefix}-overlayer-content`)
      .children(
        this.sheetImages.el,
        this.editor.el,
        this.selector.el,
      );
    this.scrollViewportEl = h('div', `${cssPrefix}-scroll-viewport`)
      .children(this.overlayerCEl, this.headerDropEl = h('div', `${cssPrefix}-header-drop-indicator`).hide());
    this.scrollContentEl = h('div', `${cssPrefix}-scroll-content`)
      .child(this.scrollViewportEl);
    this.overlayerEl = h('div', `${cssPrefix}-overlayer`)
      .child(this.scrollContentEl);
    // sortFilter
    this.sortFilter = new SortFilter();
    // root element
    this.el.children(
      this.tableEl,
      this.overlayerEl.el,
      this.rowResizer.el,
      this.colResizer.el,
      this.verticalScrollbar.el,
      this.horizontalScrollbar.el,
      this.contextMenu.el,
      this.modalValidation.el,
      this.modalHyperlink.el,
      this.sortFilter.el,
    );
    // table
    this.table = new Table(this.tableEl.el, data);
    sheetInitEvents.call(this);
    sheetReset.call(this);
    // init selector [0, 0]
    selectorSet.call(this, false, 0, 0);
  }

  on(eventName, func) {
    this.eventMap.on(eventName, func);
    return this;
  }

  trigger(eventName, ...args) {
    const { eventMap } = this;
    if (eventName === 'change' && this.data.settings.mode !== 'read') {
      this.toolbar.setSaveEnabled(true);
    }
    eventMap.fire(eventName, args);
  }

  resetData(data) {
    // before
    this.editor.clear();
    // after
    this.data = data;
    verticalScrollbarSet.call(this);
    horizontalScrollbarSet.call(this);
    this.toolbar.resetData(data);
    this.formulaBar.resetData(data);
    this.toolbar.setSaveEnabled(false);
    this.print.resetData(data);
    this.selector.resetData(data);
    this.table.resetData(data);
    this.sheetImages.setEditable(data.settings.mode !== 'read');
    this.sheetImages.reset(data);
  }

  loadData(data) {
    this.data.setData(data);
    sheetReset.call(this);
    return this;
  }

  // freeze rows or cols
  freeze(ri, ci) {
    const { data } = this;
    data.setFreeze(ri, ci);
    sheetReset.call(this);
    return this;
  }

  undo() {
    this.data.undo();
    sheetReset.call(this);
  }

  redo() {
    this.data.redo();
    sheetReset.call(this);
  }

  reload() {
    sheetReset.call(this);
    return this;
  }

  getRect() {
    const { data } = this;
    return { width: data.viewWidth(), height: data.viewHeight() };
  }

  getTableOffset() {
    const { rows, cols } = this.data;
    const { width, height } = this.getRect();
    return {
      width: width - cols.indexWidth,
      height: height - rows.height,
      left: cols.indexWidth,
      top: rows.height,
    };
  }

  scrollToCell(ri, ci) {
    selectorSet.call(this, false, ri, ci);
    scrollbarMove.call(this);
    sheetReset.call(this);
  }
}
