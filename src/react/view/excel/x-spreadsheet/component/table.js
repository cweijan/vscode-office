import { stringAt } from '../core/alphabet';
import { getFontSizePxByPt } from '../core/font';
import _cell from '../core/cell';
import { formulam } from '../core/formula';
import { formatm } from '../core/format';

import {
  Draw, DrawBox, thinLineWidth, npx,
} from '../canvas/draw';
import { getExcelThemeColor, resolveExcelCellBg, resolveExcelCellColor } from '../../theme';

// gobal var
const cellPaddingWidth = 10;

function computeAutoRowHeights(data, ctx) {
  const { rows, cols, styles } = data;
  const defaultStyle = data.defaultStyle();
  const defaultFontName = (defaultStyle.font && defaultStyle.font.name) || 'Arial';
  const defaultFontSizePt = (defaultStyle.font && defaultStyle.font.size) || 10;

  rows.each((ri, row) => {
    if (!row || !row.cells) return;
    let maxNeededHeight = 0;

    Object.keys(row.cells).forEach((ci) => {
      const cell = row.cells[ci];
      if (!cell || !cell.text) return;

      const style = cell.style != null ? styles[cell.style] : null;
      if (!style || !style.textwrap) return;

      const rindex = parseInt(ri, 10);
      const cindex = parseInt(ci, 10);

      // skip non-origin merge cells
      const merge = data.merges && data.merges.getFirstIncludes(rindex, cindex);
      if (merge && (merge.sri !== rindex || merge.sci !== cindex)) return;

      const colWidth = cols.getWidth(cindex);
      const innerWidth = colWidth - cellPaddingWidth * 2 - 2;

      const fontName = (style.font && style.font.name) || defaultFontName;
      const fontSizePt = (style.font && style.font.size) || defaultFontSizePt;
      const fontSizePx = getFontSizePxByPt(fontSizePt);
      const bold = (style.font && style.font.bold) ? 'bold' : '';
      const italic = (style.font && style.font.italic) ? 'italic' : '';
      ctx.font = `${italic} ${bold} ${npx(fontSizePx)}px ${fontName}`.trim();

      const lines = `${cell.text}`.split('\n');
      let lineCount = 0;
      lines.forEach((line) => {
        const lineWidth = ctx.measureText(line).width;
        const innerWidthPx = npx(innerWidth);
        if (innerWidthPx > 0 && lineWidth > innerWidthPx) {
          lineCount += Math.ceil(lineWidth / innerWidthPx);
        } else {
          lineCount += 1;
        }
      });

      const neededHeight = lineCount * (fontSizePx + 2) + cellPaddingWidth * 2 + 2;
      if (neededHeight > maxNeededHeight) maxNeededHeight = neededHeight;
    });

    if (maxNeededHeight > 0) {
      const rindex = parseInt(ri, 10);
      const currentHeight = rows.getHeight(rindex);
      if (maxNeededHeight > currentHeight) {
        rows.setHeight(rindex, Math.ceil(maxNeededHeight));
      }
    }
  });
}

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
  return {
    textAlign: 'center',
    textBaseline: 'middle',
    font: `500 ${npx(12)}px Source Sans Pro`,
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
  const { sortedRowMap, rows, cols } = data;
  if (rows.isHide(rindex) || cols.isHide(cindex)) return;
  let nrindex = rindex;
  if (sortedRowMap.has(rindex)) {
    nrindex = sortedRowMap.get(rindex);
  }

  const cell = data.getCell(nrindex, cindex);
  const isLocked = !data.canEditCell(nrindex, cindex);
  const lockedColor = getExcelThemeColor('--excel-locked-indicator', 'rgba(61, 153, 112, 0.42)');

  if (cell === null) {
    if (!isLocked) return;
    const style = data.getCellStyleOrDefault(nrindex, cindex);
    const dbox = getDrawBox(data, rindex, cindex, yoffset);
    dbox.bgcolor = resolveExcelCellBg(style.bgcolor);
    draw.rect(dbox, () => {});
    draw.frozen(dbox, lockedColor);
    return;
  }

  const style = data.getCellStyleOrDefault(nrindex, cindex);

  const dbox = getDrawBox(data, rindex, cindex, yoffset);
  dbox.bgcolor = resolveExcelCellBg(style.bgcolor);
  if (style.border !== undefined) {
    const mergeRange = data.merges && data.merges.getFirstIncludes(nrindex, cindex);
    const isMergeSubcell = mergeRange && (mergeRange.sri !== nrindex || mergeRange.sci !== cindex);
    if (!isMergeSubcell) {
      dbox.setBorders(style.border);
      draw.strokeBorders(dbox);
    }
  }
  draw.rect(dbox, () => {
    // render text
    let cellText = '';
    if (!data.settings.evalPaused) {
      cellText = _cell.render(cell.text || '', formulam, (y, x) => (data.getCellTextOrDefault(x, y)));
    } else {
      cellText = cell.text || '';
    }
    if (style.format) {
      // console.log(data.formatm, '>>', cell.format);
      cellText = formatm[style.format].render(cellText);
    }
    const font = Object.assign({}, style.font);
    font.size = getFontSizePxByPt(font.size);
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
    const error = data.validations.getError(rindex, cindex);
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
  const sumHeight = viewRange.h; // rows.sumHeight(viewRange.sri, viewRange.eri + 1);
  const sumWidth = viewRange.w; // cols.sumWidth(viewRange.sci, viewRange.eci + 1);
  const nty = ty + h;
  const ntx = tx + w;

  draw.save();
  // draw rect background
  draw.attr(tableFixedHeaderCleanStyle());
  if (type === 'all' || type === 'left') draw.fillRect(0, nty, w, sumHeight);
  if (type === 'all' || type === 'top') draw.fillRect(ntx, 0, sumWidth, h);

  const {
    sri, sci, eri, eci,
  } = data.selector.range;
  // console.log(data.selectIndexes);
  // draw text
  // text font, align...
  draw.attr(tableFixedHeaderStyle());
  // y-header-text
  if (type === 'all' || type === 'left') {
    data.rowEach(viewRange.sri, viewRange.eri, (i, y1, rowHeight) => {
      const y = nty + y1;
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
    draw.line([0, sumHeight + nty], [w, sumHeight + nty]);
    draw.line([w, nty], [w, sumHeight + nty]);
  }
  // x-header-text
  if (type === 'all' || type === 'top') {
    data.colEach(viewRange.sci, viewRange.eci, (i, x1, colWidth) => {
      const x = ntx + x1;
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
    draw.line([sumWidth + ntx, 0], [sumWidth + ntx, h]);
    draw.line([0, h], [sumWidth + ntx, h]);
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
  sri, sci, eri, eci, w, h,
}, fw, fh, tx, ty) {
  const { draw, data } = this;
  const { settings } = data;

  draw.save();
  draw.attr(tableGridStyle())
    .translate(fw + tx, fh + ty);
  // const sumWidth = cols.sumWidth(sci, eci + 1);
  // const sumHeight = rows.sumHeight(sri, eri + 1);
  // console.log('sumWidth:', sumWidth);
  // draw.clearRect(0, 0, w, h);
  if (!settings.showGrid) {
    draw.restore();
    return;
  }
  // console.log('rowStart:', rowStart, ', rowLen:', rowLen);
  data.rowEach(sri, eri, (i, y, ch) => {
    // console.log('y:', y);
    if (i !== sri) draw.line([0, y], [w, y]);
    if (i === eri) draw.line([0, y + ch], [w, y + ch]);
  });
  data.colEach(sci, eci, (i, x, cw) => {
    if (i !== sci) draw.line([x, 0], [x, h]);
    if (i === eci) draw.line([x + cw, 0], [x + cw, h]);
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
    this.autoHeightsComputed = false;
    this.render();
  }

  render() {
    // resize canvas
    const { data } = this;
    if (!this.autoHeightsComputed) {
      computeAutoRowHeights(data, this.draw.ctx);
      this.autoHeightsComputed = true;
    }
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
    // 1
    renderContentGrid.call(this, viewRange, fw, fh, tx, ty);
    renderContent.call(this, viewRange, fw, fh, -x, -y);
    renderFixedHeaders.call(this, 'all', viewRange, fw, fh, tx, ty);
    renderFixedLeftTopCell.call(this, fw, fh);
    const [fri, fci] = data.freeze;
    if (fri > 0 || fci > 0) {
      // 2
      if (fri > 0) {
        const vr = viewRange.clone();
        vr.sri = 0;
        vr.eri = fri - 1;
        vr.h = ty;
        renderContentGrid.call(this, vr, fw, fh, tx, 0);
        renderContent.call(this, vr, fw, fh, -x, 0);
        renderFixedHeaders.call(this, 'top', vr, fw, fh, tx, 0);
      }
      // 3
      if (fci > 0) {
        const vr = viewRange.clone();
        vr.sci = 0;
        vr.eci = fci - 1;
        vr.w = tx;
        renderContentGrid.call(this, vr, fw, fh, 0, ty);
        renderFixedHeaders.call(this, 'left', vr, fw, fh, 0, ty);
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
