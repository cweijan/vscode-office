import opentype from 'opentype.js';

export interface FontInfo {
    font: any;
    fontScale: number;
    fontSize: number;
    fontBaseline: number;
}

async function loadFontAsBuffer(uri: string): Promise<ArrayBuffer> {
    const fontBuffer = fetch(uri).then(f => f.arrayBuffer())
    if (uri.includes('woff2')) {
        const loadScript = (src) => new Promise((onload) => document.documentElement.append(
            Object.assign(document.createElement('script'), { src, onload })
        ));
        return loadScript('woff2_decompress_binding.js')
            .then(() => new Promise((done) => window['Module'] = { onRuntimeInitialized: done }))
            .then(async () => window['Module'].decompress(await fontBuffer))
            .then(buffer => Uint8Array.from(buffer).buffer)
    }
    return fontBuffer;
}

const cellWidth = 100, cellHeight = 84;

export async function loadFont(uri: string): Promise<FontInfo> {
    const font = opentype.parse(await loadFontAsBuffer(uri))

    const cellMarginTop = 20, cellMarginBottom = 20, cellMarginLeftRight = 1;
    const w = cellWidth - cellMarginLeftRight * 2,
        h = cellHeight - cellMarginTop - cellMarginBottom,
        head = font.tables.head,
        maxHeight = head.yMax - head.yMin;

    return {
        font,
        fontBaseline: cellMarginTop + h * head.yMax / maxHeight,
        fontSize: Math.min(w / (head.xMax - head.xMin), h / maxHeight) * font.unitsPerEm,
        fontScale: Math.min(w / (head.xMax - head.xMin), h / maxHeight)
    }
}

function limitLength(text: string = '', length: number = 11) {
    if (text.length > length) return text.slice(0, length) + '...';
    return text;
}

function renderGlyph(
    fontInfo: FontInfo,
    canvas: HTMLCanvasElement,
    glyphIndex: string | number,
    width: number,
    height: number,
    labelSize = 14,
) {
    const { font, fontScale, fontSize, fontBaseline } = fontInfo;
    const scale = width / cellWidth;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);
    if (glyphIndex >= font.numGlyphs) return;
    const glyph = font.glyphs.glyphs[glyphIndex];
    const glyphWidth = glyph.advanceWidth * fontScale * scale;
    const xCenter = (width - glyphWidth) / 2;
    const baseline = fontBaseline * scale;
    const scaledFontSize = fontSize * scale;
    ctx.font = `${labelSize}px Arial`;
    ctx.fillStyle = '#242424';
    ctx.textAlign = 'center';
    ctx.fillText(limitLength(glyph.name, width > cellWidth ? 24 : 11), width / 2, height - 10 * scale);
    ctx.fillStyle = '#FFFFFF';
    const path = glyph.getPath(xCenter, baseline - 10 * scale, scaledFontSize);
    path.fill = '#333';
    path.draw(ctx);
}

export function renderGlyphItem(fontInfo: FontInfo, canvas: HTMLCanvasElement, glyphIndex) {
    renderGlyph(fontInfo, canvas, glyphIndex, cellWidth, cellHeight);
}

export function renderGlyphPreview(fontInfo: FontInfo, canvas: HTMLCanvasElement, glyphIndex) {
    renderGlyph(fontInfo, canvas, glyphIndex, 180, 120, 12);
}

export function formatUnicode(unicode) {
    unicode = unicode.toString(16);
    if (unicode.length > 4) {
        return ("000000" + unicode.toUpperCase()).substr(-6)
    } else {
        return ("0000" + unicode.toUpperCase()).substr(-4)
    }
}