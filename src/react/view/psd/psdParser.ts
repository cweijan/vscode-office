import { Layer, readPsd } from 'ag-psd';

export interface PsdLayerItem {
    id: string;
    name: string;
    depth: number;
    hidden: boolean;
    isGroup: boolean;
    dataUrl: string | null;
}

export interface PsdDocument {
    width: number;
    height: number;
    compositeDataUrl: string | null;
    layers: PsdLayerItem[];
}

const COMPOSITE_ID = '__composite__';

function canvasToDataUrl(canvas: HTMLCanvasElement): string {
    return canvas.toDataURL('image/png');
}

function flattenLayers(layers: Layer[], depth = 0, prefix = ''): PsdLayerItem[] {
    const items: PsdLayerItem[] = [];
    for (let index = 0; index < layers.length; index++) {
        const layer = layers[index];
        const id = `${prefix}${index}`;
        const children = layer.children;
        const isGroup = !!(children && children.length);
        items.push({
            id,
            name: layer.name || 'Layer',
            depth,
            hidden: !!layer.hidden,
            isGroup,
            dataUrl: layer.canvas ? canvasToDataUrl(layer.canvas) : null,
        });
        if (children?.length) {
            for (const child of flattenLayers(children, depth + 1, `${id}-`)) {
                items.push(child);
            }
        }
    }
    return items;
}

export function getCompositeId(): string {
    return COMPOSITE_ID;
}

export function parsePsd(buffer: ArrayBuffer): PsdDocument {
    const psd = readPsd(buffer);
    return {
        width: psd.width,
        height: psd.height,
        compositeDataUrl: psd.canvas ? canvasToDataUrl(psd.canvas) : null,
        layers: flattenLayers(psd.children ?? []),
    };
}

export function getPreviewDataUrl(document: PsdDocument, selectedId: string): string | null {
    if (selectedId === COMPOSITE_ID) {
        return document.compositeDataUrl;
    }
    const layer = document.layers.find(item => item.id === selectedId);
    return layer?.dataUrl ?? null;
}

export function getDefaultSelection(document: PsdDocument): string | null {
    if (document.compositeDataUrl) {
        return COMPOSITE_ID;
    }
    for (const layer of document.layers) {
        if (layer.dataUrl) {
            return layer.id;
        }
    }
    return document.layers[0]?.id ?? null;
}
