export interface SvgColors {
    background: string;
    fill: string;
}

function parseSvgDocument(content: string): Document | null {
    const doc = new DOMParser().parseFromString(content, 'image/svg+xml');
    if (doc.querySelector('parsererror')) {
        return null;
    }
    return doc;
}

function normalizeColor(color: string | null, fallback: string): string {
    if (!color || color === 'none' || color === 'transparent') {
        return fallback;
    }
    if (/^#[0-9a-f]{3,8}$/i.test(color)) {
        return color.length === 4
            ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
            : color.slice(0, 7);
    }
    return color;
}

export function parseSvgColors(content: string): SvgColors {
    const doc = parseSvgDocument(content);
    if (!doc) {
        return { background: '#ffffff', fill: '#409eff' };
    }

    const rects = doc.querySelectorAll('rect');
    let background = '#ffffff';
    let fill = '#409eff';

    if (rects.length > 0) {
        background = normalizeColor(rects[0].getAttribute('fill'), background);
    }
    if (rects.length > 1) {
        fill = normalizeColor(rects[1].getAttribute('fill'), fill);
    } else {
        const shape = doc.querySelector('circle, path, ellipse, polygon, line, polyline');
        if (shape) {
            fill = normalizeColor(shape.getAttribute('fill'), fill);
        }
    }

    return { background, fill };
}

function updateFirstRectFill(content: string, color: string): string {
    const doc = parseSvgDocument(content);
    if (!doc) return content;
    const rect = doc.querySelector('rect');
    if (!rect) return content;
    rect.setAttribute('fill', color);
    return serializeSvg(doc);
}

function updateShapeFill(content: string, color: string): string {
    const doc = parseSvgDocument(content);
    if (!doc) return content;

    const rects = doc.querySelectorAll('rect');
    if (rects.length > 1) {
        rects[1].setAttribute('fill', color);
        return serializeSvg(doc);
    }

    const shape = doc.querySelector('circle, path, ellipse, polygon, line, polyline');
    if (shape) {
        shape.setAttribute('fill', color);
        return serializeSvg(doc);
    }

    return content;
}

export function updateSvgBackground(content: string, color: string): string {
    return updateFirstRectFill(content, color);
}

export function updateSvgFill(content: string, color: string): string {
    return updateShapeFill(content, color);
}

function serializeSvg(doc: Document): string {
    return new XMLSerializer().serializeToString(doc.documentElement);
}

export function formatSvg(content: string): string {
    const doc = parseSvgDocument(content);
    if (!doc) return content.trim();

    const raw = serializeSvg(doc);
    let formatted = '';
    let pad = 0;
    const lines = raw.replace(/>\s*</g, '><').replace(/</g, '\n<').split('\n');

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (trimmed.startsWith('</')) {
            pad = Math.max(pad - 1, 0);
        }
        formatted += `${'  '.repeat(pad)}${trimmed}\n`;
        if (
            trimmed.startsWith('<')
            && !trimmed.startsWith('</')
            && !trimmed.startsWith('<?')
            && !trimmed.endsWith('/>')
            && !trimmed.includes('</')
        ) {
            pad++;
        }
    }

    return formatted.trim();
}

export async function exportSvgAsPng(content: string, fileName: string): Promise<void> {
    const doc = parseSvgDocument(content);
    if (!doc) {
        throw new Error('Invalid SVG content');
    }

    const svgEl = doc.documentElement;
    const width = Number(svgEl.getAttribute('width')) || 512;
    const height = Number(svgEl.getAttribute('height')) || 512;
    const viewBox = svgEl.getAttribute('viewBox');
    let w = width;
    let h = height;
    if (viewBox) {
        const parts = viewBox.split(/\s+/).map(Number);
        if (parts.length === 4) {
            w = parts[2];
            h = parts[3];
        }
    }

    const blob = new Blob([ensureSvgNamespace(content)], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    try {
        const image = await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Failed to render SVG'));
            img.src = url;
        });

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Failed to create canvas');
        }
        ctx.drawImage(image, 0, 0, w, h);

        const pngBlob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob(resolve, 'image/png');
        });
        if (!pngBlob) {
            throw new Error('Failed to export PNG');
        }

        const pngName = fileName.replace(/\.svg$/i, '.png');
        downloadBlob(pngBlob, pngName);
    } finally {
        URL.revokeObjectURL(url);
    }
}

export function ensureSvgNamespace(content: string): string {
    const trimmed = content.trim();
    if (!trimmed || /xmlns\s*=/.test(trimmed)) {
        return trimmed;
    }
    return trimmed.replace(/<svg\b/i, '<svg xmlns="http://www.w3.org/2000/svg"');
}

export function downloadSvg(content: string, fileName: string): void {
    const blob = new Blob([content], { type: 'image/svg+xml;charset=utf-8' });
    downloadBlob(blob, fileName);
}

function downloadBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
}

export function getFileNameFromPath(path: string): string {
    try {
        const pathname = new URL(path).pathname;
        const parts = pathname.split('/');
        return parts[parts.length - 1] || 'image.svg';
    } catch {
        const parts = path.split(/[/\\]/);
        return parts[parts.length - 1] || 'image.svg';
    }
}
