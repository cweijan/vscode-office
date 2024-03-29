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

const cellWidth = 60, cellHeight = 70;

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

export function renderGlyphItem(fontInfo: FontInfo, canvas, glyphIndex) {
    const { font, fontScale, fontSize, fontBaseline } = fontInfo;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, cellWidth, cellHeight);
    if (glyphIndex >= font.numGlyphs) return;
    ctx.fillStyle = '#AAA';
    ctx.font = '9px "Open Sans"';
    ctx.fillText(glyphIndex, 2, cellHeight - 2);
    const glyph = font.glyphs.glyphs[glyphIndex],
        glyphWidth = glyph.advanceWidth * fontScale,
        xmin = (cellWidth - glyphWidth) / 2,
        x0 = xmin;
    ctx.fillStyle = '#FFFFFF';
    const path = glyph.getPath(x0, fontBaseline, fontSize);
    path.fill = "#333";
    path.draw(ctx);
}

export function formatUnicode(unicode) {
    unicode = unicode.toString(16);
    if (unicode.length > 4) {
        return ("000000" + unicode.toUpperCase()).substr(-6)
    } else {
        return ("0000" + unicode.toUpperCase()).substr(-4)
    }
}