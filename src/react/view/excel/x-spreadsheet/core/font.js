// docs
import './_.prototypes';

function getSystemDefaultFont() {
  const ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
  if (ua.includes('Mac OS')) return { key: 'PingFang SC', title: 'PingFang SC' };
  if (ua.includes('Windows')) return { key: 'Microsoft YaHei', title: 'Microsoft YaHei' };
  return { key: 'Arial', title: 'Arial' };
}

/** default font list
 * @type {BaseFont[]}
 */
const macCnFonts = [
  { key: 'STSong', title: '华文宋体' },
  { key: 'STHeiti', title: '华文黑体' },
  { key: 'STKaiti', title: '华文楷体' },
  { key: 'STFangsong', title: '华文仿宋' },
  { key: 'STXihei', title: '华文细黑' },
  { key: 'Menlo', title: 'Menlo' },
];

const winCnFonts = [
  { key: 'SimSun', title: '宋体' },
  { key: 'SimHei', title: '黑体' },
  { key: 'KaiTi', title: '楷体' },
  { key: 'FangSong', title: '仿宋' },
  { key: 'Consolas', title: 'Consolas' },
];

function getPlatformCnFonts() {
  const ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
  if (ua.includes('Mac OS')) return macCnFonts;
  if (ua.includes('Windows')) return winCnFonts;
  return [];
}

const baseFonts = [
  // 系统默认
  getSystemDefaultFont(),
  { divider: true },
  // 通用字体
  { key: 'Arial', title: 'Arial' },
  { key: 'Helvetica', title: 'Helvetica' },
  { key: 'Verdana', title: 'Verdana' },
  { key: 'Tahoma', title: 'Tahoma' },
  { key: 'Calibri', title: 'Calibri' },
  { key: 'Segoe UI', title: 'Segoe UI' },
  { key: 'Times New Roman', title: 'Times New Roman' },
  { key: 'Georgia', title: 'Georgia' },
  { key: 'Courier New', title: 'Courier New' },
  // 平台中文字体
  ...(() => {
    const cnFonts = getPlatformCnFonts();
    return cnFonts.length ? [{ divider: true }, ...cnFonts] : [];
  })(),
];

/** default fontSize list — aligned with Excel standard sizes
 * @type {FontSize[]}
 */
const fontSizes = [
  { pt: 8, px: 10.7 },
  { pt: 9, px: 12 },
  { pt: 10, px: 13.3 },
  { pt: 11, px: 14.7 },
  { pt: 12, px: 16 },
  { pt: 14, px: 18.7 },
  { pt: 16, px: 21.3 },
  { pt: 18, px: 24 },
  { pt: 20, px: 26.7 },
  { pt: 22, px: 29.3 },
  { pt: 24, px: 32 },
  { pt: 28, px: 37.3 },
  { pt: 36, px: 48 },
  { pt: 48, px: 64 },
  { pt: 72, px: 96 },
];

/** map pt to px
 * @date 2019-10-10
 * @param {fontsizePT} pt
 * @returns {fontsizePX}
 */
function getFontSizePxByPt(pt) {
  for (let i = 0; i < fontSizes.length; i += 1) {
    const fontSize = fontSizes[i];
    if (fontSize.pt === pt) {
      return fontSize.px;
    }
  }
  return pt;
}

/** transform baseFonts to map
 * @date 2019-10-10
 * @param {BaseFont[]} [ary=[]]
 * @returns {object}
 */
function fonts(ary = []) {
  const map = {};
  baseFonts.concat(ary).forEach((f) => {
    map[f.key] = f;
  });
  return map;
}

export default {};
export {
  fontSizes,
  fonts,
  baseFonts,
  getFontSizePxByPt,
};
