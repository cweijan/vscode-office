import { stringAt } from '../core/alphabet';
import { getFontSizePxByPt } from '../core/font';
import { displayCellText } from '../../excel_cell_display';

import {
  Draw, DrawBox, thinLineWidth, npx,
} from '../canvas/draw';
import { getExcelThemeColor, resolveExcelCellBg, resolveExcelCellColor } from '../../theme';

// gobal var
const cellPaddingWidth = 10;

function tableFixedHeaderCleanStyle() {
  return { fillStyle: getExcelThemeColor('--excel-header-bg', '#f4f5f8') };
}

function tableGridStyle() {
  return {
    fillStyle: getExcelThemeColor('--excel-cell-bg', '#fff'),
    lineWidth: thinLineWidth,
    strokeStyle: getExcelThemeColor('--excel-grid-line', '#e6e6e6'),
  };
}

function tableFixedHeaderStyle() {
  const scale = this && this.data ? this.data.getZoomScale() : 1;
  return {
    textAlign: 'center',
    textBaseline: 'middle',
    font: `500 ${npx(12 * scale)}px Source Sans Pro`,
    fillStyle: getExcelThemeColor('--excel-header-fg', '#585757'),
    lineWidth: thinLineWidth(),
    strokeStyle: getExcelThemeColor('--excel-grid-line', '#e6e6e6'),
  };
}

function getDrawBox(data, rindex, cindex, yoffset = 0) {
  const {
    left, top, width, height,
  } = data.cellRect(rindex, cindex);
  return new DrawBox(left, top + yoffset, width, height, cellPaddingWidth);
}
/*
function renderCellBorders(bboxes, translateFunc) {
  const { draw } = this;
  if (bboxes) {
    const rset = new Set();
    // console.log('bboxes:', bboxes);
    bboxes.forEach(({ ri, ci, box }) => {
      if (!rset.has(ri)) {
        rset.add(ri);
        translateFunc(ri);
      }
      draw.strokeBorders(box);
    });
  }
}
*/

export function renderCell(draw, data, rindex, cindex, yoffset = 0) {
  const { rows, cols } = data;
  if (rows.isHide(rindex) || cols.isHide(cindex)) return;

  const cell = data.getCell(rindex, cindex);
  const isLocked = !data.canEditCell(rindex, cindex);
  const lockedColor = getExcelThemeColor('--excel-locked-indicator', 'rgba(61, 153, 112, 0.42)');

  if (cell === null) {
    if (!isLocked) return;
    const style = data.getCellStyleOrDefault(rindex, cindex);
    const dbox = getDrawBox(data, rindex, cindex, yoffset);
    dbox.bgcolor = resolveExcelCellBg(style.bgcolor);
    draw.rect(dbox, () => {});
    draw.frozen(dbox, lockedColor);
    return;
  }

  const style = data.getCellStyleOrDefault(rindex, cindex);
  const defaultStyle = data.defaultStyle();

  const dbox = getDrawBox(data, rindex, cindex, yoffset);
  dbox.bgcolor = resolveExcelCellBg(style.bgcolor);
  if (style.border !== undefined) {
    const dataRow = data.sortedRowMap.has(rindex) ? data.sortedRowMap.get(rindex) : rindex;
    const mergeRange = data.merges && data.merges.getFirstIncludes(dataRow, cindex);
    const isMergeSubcell = mergeRange && (mergeRange.sri !== dataRow || mergeRange.sci !== cindex);
    if (!isMergeSubcell) {
      dbox.setBorders(style.border);
      draw.strokeBorders(dbox);
    }
  }
  draw.rect(dbox, () => {
    // render text
    const cellText = displayCellText(cell, style, (x, y) => data.rows.getCell(y, x), data.settings.evalPaused);
    const font = Object.assign({}, style.font);
    if (!font.name) {
      font.name = (defaultStyle.font && defaultStyle.font.name) || 'Arial';
    }
    font.size = getFontSizePxByPt(font.size || (defaultStyle.font && defaultStyle.font.size) || 11) * data.getZoomScale();
    const hyperlink = data.getHyperlink(rindex, cindex);
    const drawStyle = {
      align: style.align,
      valign: style.valign,
      font,
      color: hyperlink ? '#0563c1' : resolveExcelCellColor(style.color),
      strike: style.strike,
      underline: style.underline || !!hyperlink,
    };
    draw.text(cellText, dbox, drawStyle, style.textwrap);
    // error
    const error = data.getValidationError(rindex, cindex);
    if (error) {
      // console.log('error:', rindex, cindex, error);
      draw.error(dbox);
    }
    if (isLocked) {
      draw.frozen(dbox, lockedColor);
    }
  });
}

function renderAutofilter(viewRange) {
  const { data, draw } = this;
  if (viewRange) {
    const { autoFilter } = data;
    if (!autoFilter.active()) return;
    const afRange = autoFilter.hrange();
    if (viewRange.intersects(afRange)) {
      afRange.each((ri, ci) => {
        const dbox = getDrawBox(data, ri, ci);
        draw.dropdown(dbox);
      });
    }
  }
}

function renderContent(viewRange, fw, fh, tx, ty) {
  const { draw, data } = this;
  draw.save();
  draw.translate(fw, fh)
    .translate(tx, ty);

  const { exceptRowSet } = data;
  const rowVisible = (ri) => !exceptRowSet.has(ri);

  // 1 render cell
  draw.save();
  viewRange.each((ri, ci) => {
    renderCell(draw, data, ri, ci);
  }, rowVisible);
  draw.restore();


  // 2 render mergeCell
  const rset = new Set();
  draw.save();
  data.eachMergesInView(viewRange, ({ sri, sci, eri }) => {
    if (!exceptRowSet.has(sri)) {
      renderCell(draw, data, sri, sci);
    } else if (!rset.has(sri)) {
      rset.add(sri);
      const height = data.rows.sumHeight(sri, eri + 1, exceptRowSet);
      draw.translate(0, -height);
    }
  });
  draw.restore();

  // 3 render autofilter
  renderAutofilter.call(this, viewRange);

  draw.restore();
}

function renderSelectedHeaderCell(x, y, w, h) {
  // const { draw } = this;
  // draw.save();
  // draw.attr({ fillStyle: 'rgba(75, 137, 255, 0.08)' })
  //   .fillRect(x, y, w, h);
  // draw.restore();
}

// viewRange
// type: all | left | top
// w: the fixed width of header
// h: the fixed height of header
// tx: moving distance on x-axis
// ty: moving distance on y-axis
function renderFixedHeaders(type, viewRange, w, h, tx, ty) {
  const { draw, data } = this;
  const { rows, cols, exceptRowSet } = data;
  const {
    sri: viewSri, sci: viewSci, eri: viewEri, eci: viewEci,
  } = viewRange;
  const sumHeight = rows.sumHeight(viewSri, viewEri + 1, exceptRowSet);
  const sumWidth = cols.sumWidth(viewSci, viewEci + 1);
  const rowOrigin = rows.sumHeight(0, viewSri, exceptRowSet);
  const colOrigin = cols.sumWidth(0, viewSci);

  draw.save();
  // draw rect background
  draw.attr(tableFixedHeaderCleanStyle());
  if (type === 'all' || type === 'left') {
    draw.fillRect(0, h + ty + rowOrigin, w, sumHeight);
  }
  if (type === 'all' || type === 'top') {
    draw.fillRect(w + tx + colOrigin, 0, sumWidth, h);
  }

  const {
    sri, sci, eri, eci,
  } = data.selector.range;
  // console.log(data.selectIndexes);
  // draw text
  // text font, align...
  draw.attr(tableFixedHeaderStyle.call(this));
  // y-header-text
  if (type === 'all' || type === 'left') {
    data.rowEach(viewSri, viewEri, (i, y1, rowHeight) => {
      const y = h + ty + rowOrigin + y1;
      const ii = i;
      draw.line([0, y], [w, y]);
      if (sri <= ii && ii < eri + 1) {
        renderSelectedHeaderCell.call(this, 0, y, w, rowHeight);
      }
      draw.fillText(ii + 1, w / 2, y + (rowHeight / 2));
      if (i > 0 && data.rows.isHide(i - 1)) {
        draw.save();
        draw.attr({ strokeStyle: getExcelThemeColor('--excel-muted-line', '#c6c6c6') });
        draw.line([5, y + 5], [w - 5, y + 5]);
        draw.restore();
      }
    });
    draw.line([0, h + ty + rowOrigin + sumHeight], [w, h + ty + rowOrigin + sumHeight]);
    draw.line([w, h + ty + rowOrigin], [w, h + ty + rowOrigin + sumHeight]);
  }
  // x-header-text
  if (type === 'all' || type === 'top') {
    data.colEach(viewSci, viewEci, (i, x1, colWidth) => {
      const x = w + tx + colOrigin + x1;
      const ii = i;
      draw.line([x, 0], [x, h]);
      if (sci <= ii && ii < eci + 1) {
        renderSelectedHeaderCell.call(this, x, 0, colWidth, h);
      }
      draw.fillText(stringAt(ii), x + (colWidth / 2), h / 2);
      if (i > 0 && data.cols.isHide(i - 1)) {
        draw.save();
        draw.attr({ strokeStyle: getExcelThemeColor('--excel-muted-line', '#c6c6c6') });
        draw.line([x + 5, 5], [x + 5, h - 5]);
        draw.restore();
      }
    });
    draw.line([w + tx + colOrigin + sumWidth, 0], [w + tx + colOrigin + sumWidth, h]);
    draw.line([0, h], [w + tx + colOrigin + sumWidth, h]);
  }
  draw.restore();
}

function renderFixedLeftTopCell(fw, fh) {
  const { draw } = this;
  draw.save();
  // left-top-cell
  draw.attr({ fillStyle: getExcelThemeColor('--excel-header-bg', '#f4f5f8') })
    .fillRect(0, 0, fw, fh);
  draw.restore();
}

function renderContentGrid({
  sri, sci, eri, eci,
}, fw, fh, tx, ty) {
  const { draw, data } = this;
  const { settings, rows, cols, exceptRowSet } = data;

  draw.save();
  draw.attr(tableGridStyle())
    .translate(fw, fh)
    .translate(tx, ty);
  // const sumWidth = cols.sumWidth(sci, eci + 1);
  // const sumHeight = rows.sumHeight(sri, eri + 1);
  // console.log('sumWidth:', sumWidth);
  // draw.clearRect(0, 0, w, h);
  if (!settings.showGrid) {
    draw.restore();
    return;
  }
  // Use absolute sheet coordinates so grid stays aligned with cells under pixel scroll.
  const rowOrigin = rows.sumHeight(0, sri, exceptRowSet);
  const colOrigin = cols.sumWidth(0, sci);
  const gridWidth = cols.sumWidth(sci, eci + 1);
  const gridHeight = rows.sumHeight(sri, eri + 1, exceptRowSet);
  // console.log('rowStart:', rowStart, ', rowLen:', rowLen);
  data.rowEach(sri, eri, (i, y, ch) => {
    const ay = rowOrigin + y;
    // console.log('y:', y);
    if (i !== sri) draw.line([colOrigin, ay], [colOrigin + gridWidth, ay]);
    if (i === eri) draw.line([colOrigin, ay + ch], [colOrigin + gridWidth, ay + ch]);
  });
  data.colEach(sci, eci, (i, x, cw) => {
    const ax = colOrigin + x;
    if (i !== sci) draw.line([ax, rowOrigin], [ax, rowOrigin + gridHeight]);
    if (i === eci) draw.line([ax + cw, rowOrigin], [ax + cw, rowOrigin + gridHeight]);
  });
  draw.restore();
}

function renderFreezeHighlightLine(fw, fh, ftw, fth) {
  const { draw, data } = this;
  const twidth = data.viewWidth() - fw;
  const theight = data.viewHeight() - fh;
  draw.save()
    .translate(fw, fh)
    .attr({ strokeStyle: getExcelThemeColor('--excel-selection', 'rgba(75, 137, 255, .6)') });
  draw.line([0, fth], [twidth, fth]);
  draw.line([ftw, 0], [ftw, theight]);
  draw.restore();
}

/** end */
class Table {
  constructor(el, data) {
    this.el = el;
    this.draw = new Draw(el, data.viewWidth(), data.viewHeight());
    this.data = data;
  }

  resetData(data) {
    this.data = data;
    this.render();
  }

  render() {
    // resize canvas
    const { data } = this;
    const { rows, cols } = data;
    // fixed width of header
    const fw = cols.indexWidth;
    // fixed height of header
    const fh = rows.height;

    this.draw.resize(data.viewWidth(), data.viewHeight());
    this.clear();

    const viewRange = data.viewRange();
    // renderAll.call(this, viewRange, data.scroll);
    const tx = data.freezeTotalWidth();
    const ty = data.freezeTotalHeight();
    const { x, y } = data.scroll;
    // Keep grid/headers on the same translate as cell content so pixel-scroll
    // partial offsets stay aligned on both axes.
    // 1
    renderContentGrid.call(this, viewRange, fw, fh, -x, -y);
    renderContent.call(this, viewRange, fw, fh, -x, -y);
    renderFixedHeaders.call(this, 'all', viewRange, fw, fh, -x, -y);
    renderFixedLeftTopCell.call(this, fw, fh);
    const [fri, fci] = data.freeze;
    if (fri > 0 || fci > 0) {
      // 2
      if (fri > 0) {
        const vr = viewRange.clone();
        vr.sri = 0;
        vr.eri = fri - 1;
        vr.h = ty;
        renderContentGrid.call(this, vr, fw, fh, -x, 0);
        renderContent.call(this, vr, fw, fh, -x, 0);
        renderFixedHeaders.call(this, 'top', vr, fw, fh, -x, 0);
      }
      // 3
      if (fci > 0) {
        const vr = viewRange.clone();
        vr.sci = 0;
        vr.eci = fci - 1;
        vr.w = tx;
        renderContentGrid.call(this, vr, fw, fh, 0, -y);
        renderFixedHeaders.call(this, 'left', vr, fw, fh, 0, -y);
        renderContent.call(this, vr, fw, fh, 0, -y);
      }
      // 4
      const freezeViewRange = data.freezeViewRange();
      renderContentGrid.call(this, freezeViewRange, fw, fh, 0, 0);
      renderFixedHeaders.call(this, 'all', freezeViewRange, fw, fh, 0, 0);
      renderContent.call(this, freezeViewRange, fw, fh, 0, 0);
      // 5
      renderFreezeHighlightLine.call(this, fw, fh, tx, ty);
    }
  }

  clear() {
    this.draw.clear();
  }
}

export default Table;
