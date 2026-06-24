/* global window */
export const cssPrefix = 'x-spreadsheet';
export const dpr = window.devicePixelRatio || 1;
/** 视口最少列数（A–X） */
export const MIN_VIEW_COLS = 24;
/** 视口最少行数 */
export const MIN_VIEW_ROWS = 40;
export default {
  cssPrefix,
  dpr,
  MIN_VIEW_COLS,
  MIN_VIEW_ROWS,
};
