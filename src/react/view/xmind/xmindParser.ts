import { convertXmindToMindElixir, importXMindFile } from '@mind-elixir/import-xmind';
import JSZip from 'jszip';
import type { MindElixirData, NodeObj } from 'mind-elixir';

export interface XmindSheet {
    id: string;
    title: string;
    data: MindElixirData;
}

export interface XmindDocument {
    sheets: XmindSheet[];
    resolveImageUrl: (url: string) => string;
    dispose: () => void;
}

const XAP_PREFIX = /^xap:(resources|attachments|resource)\//i;
const RESOURCE_DIRS = ['resources/', 'attachments/'];

function getMimeType(path: string): string {
    const lower = path.toLowerCase();
    if (lower.endsWith('.png')) {
        return 'image/png';
    }
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
        return 'image/jpeg';
    }
    if (lower.endsWith('.gif')) {
        return 'image/gif';
    }
    if (lower.endsWith('.webp')) {
        return 'image/webp';
    }
    if (lower.endsWith('.svg')) {
        return 'image/svg+xml';
    }
    if (lower.endsWith('.bmp')) {
        return 'image/bmp';
    }
    return 'application/octet-stream';
}

async function buildImageResourceMap(buffer: ArrayBuffer): Promise<{
    map: Map<string, string>;
    blobUrls: string[];
}> {
    const zip = await JSZip.loadAsync(buffer);
    const map = new Map<string, string>();
    const blobUrls: string[] = [];

    for (const [path, entry] of Object.entries(zip.files)) {
        if (entry.dir) {
            continue;
        }
        const normalizedPath = path.replace(/\\/g, '/');
        const lowerPath = normalizedPath.toLowerCase();
        if (!RESOURCE_DIRS.some(dir => lowerPath.startsWith(dir))) {
            continue;
        }

        const mime = getMimeType(normalizedPath);
        const data = await entry.async('uint8array');
        const blob = new Blob([data], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        blobUrls.push(blobUrl);

        const fileName = normalizedPath.split('/').pop() ?? normalizedPath;
        const zipPath = normalizedPath.replace(/^\/+/, '');
        const variants = new Set<string>([
            normalizedPath,
            zipPath,
            fileName,
            `xap:resources/${fileName}`,
            `xap:attachments/${fileName}`,
            `xap:resource/${fileName}`,
            `xap:resources/${zipPath}`,
            `xap:attachments/${zipPath}`,
            `xap:resource/${zipPath}`,
        ]);
        for (const key of variants) {
            map.set(key, blobUrl);
        }
    }

    return { map, blobUrls };
}

function resolveXapResourceUrl(url: string, map: Map<string, string>): string {
    if (!url || !/^xap:/i.test(url)) {
        return url;
    }
    const direct = map.get(url) ?? map.get(url.toLowerCase());
    if (direct) {
        return direct;
    }

    const withoutScheme = url.replace(/^xap:/i, '');
    const fromScheme = map.get(withoutScheme) ?? map.get(withoutScheme.toLowerCase());
    if (fromScheme) {
        return fromScheme;
    }

    const zipPath = url.replace(XAP_PREFIX, '$1/');
    const fromZipPath = map.get(zipPath) ?? map.get(zipPath.toLowerCase());
    if (fromZipPath) {
        return fromZipPath;
    }

    const fileName = zipPath.split('/').pop();
    if (fileName) {
        const fromName = map.get(fileName) ?? map.get(fileName.toLowerCase());
        if (fromName) {
            return fromName;
        }
    }

    return url;
}

function patchNodeImages(node: NodeObj, resolve: (url: string) => string): void {
    if (node.image?.url) {
        node.image = {
            ...node.image,
            url: resolve(node.image.url),
        };
    }
    if (node.children) {
        for (const child of node.children) {
            patchNodeImages(child, resolve);
        }
    }
}

export async function parseXmind(buffer: ArrayBuffer, fileName = 'document.xmind'): Promise<XmindDocument> {
    const { map, blobUrls } = await buildImageResourceMap(buffer);
    const resolveImageUrl = (url: string) => resolveXapResourceUrl(url, map);

    const file = new File([buffer], fileName, { type: 'application/vnd.xmind.workbook' });
    const sheets = await importXMindFile(file);
    const result: XmindSheet[] = [];
    for (const sheet of sheets) {
        const data = convertXmindToMindElixir(sheet);
        patchNodeImages(data.nodeData, resolveImageUrl);
        result.push({
            id: sheet.id,
            title: sheet.title || 'Untitled',
            data,
        });
    }

    return {
        sheets: result,
        resolveImageUrl,
        dispose: () => {
            for (const url of blobUrls) {
                URL.revokeObjectURL(url);
            }
            map.clear();
        },
    };
}
