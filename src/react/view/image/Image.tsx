import { useCallback, useEffect, useRef, useState } from "react";
import ImageGallery from "react-image-gallery";
import "react-image-gallery/styles/css/image-gallery.css";
import { handler } from '../../util/vscode';
import { type ImageSource, resolveImageSrc, revokeObjectUrl } from './convertImage';
import './Image.less';
import { createBrowseWheelHandler } from './browseWheel';
import SponsorBar from '../components/SponsorBar';

type WheelMode = 'navigate' | 'zoom';

const WHEEL_MODE_KEY = 'office-image-wheel-mode';

function loadWheelMode(): WheelMode {
    try {
        return localStorage.getItem(WHEEL_MODE_KEY) === 'navigate' ? 'navigate' : 'zoom';
    } catch {
        return 'zoom';
    }
}

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 5;
const MAX_LOADED_THUMBNAILS = 30;
const PLACEHOLDER = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="82" height="82"/%3E';

function ZoomIcon() {
    return (
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path fill="currentColor" d="M6.5 1a5.5 5.5 0 1 0 3.898 9.402l3.854 3.853a.5.5 0 0 0 .707-.708l-3.853-3.853A5.5 5.5 0 0 0 6.5 1zm0 1a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9z" />
            <path fill="currentColor" d="M6 5.5a.5.5 0 0 1 .5.5V6h.5a.5.5 0 0 1 0 1H6.5v.5a.5.5 0 0 1-1 0V7H5a.5.5 0 0 1 0-1h.5V6a.5.5 0 0 1 .5-.5z" />
        </svg>
    );
}

function BrowseIcon() {
    return (
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path fill="currentColor" d="M2.5 5A1.5 1.5 0 0 1 4 3.5h5A1.5 1.5 0 0 1 10.5 5v1H11.5A1.5 1.5 0 0 1 13 7.5v5A1.5 1.5 0 0 1 11.5 14h-5A1.5 1.5 0 0 1 5 12.5v-1H4A1.5 1.5 0 0 1 2.5 10V5z" opacity="0.45" />
            <path fill="currentColor" d="M4.5 2A1.5 1.5 0 0 1 6 .5h5A1.5 1.5 0 0 1 12.5 2v8A1.5 1.5 0 0 1 11 11.5H10v-1A1.5 1.5 0 0 0 8.5 9h-5A1.5 1.5 0 0 1 2 7.5V4.5h2V2z" />
            <circle cx="5.75" cy="5.25" r="0.75" fill="currentColor" />
            <path fill="currentColor" d="M3.75 8.75l1.75-1.25 1.25.9 2-1.8V10H3.75V8.75z" />
        </svg>
    );
}

export default function Image() {
    const [info, setInfo] = useState({ images: [], current: 0 } as any);
    const [resolvedImages, setResolvedImages] = useState<Record<number, string>>({});
    const [activeIndex, setActiveIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const [wheelMode, setWheelMode] = useState<WheelMode>(loadWheelMode);
    const [zoom, setZoom] = useState(1);
    const conversionQueue = useRef(Promise.resolve());
    const imageCache = useRef(new Map<number, string>());
    const browseWheel = useRef(createBrowseWheelHandler());
    const previewStart = Math.max(0, Math.min(activeIndex - Math.floor(MAX_LOADED_THUMBNAILS / 2),
        info.images.length - MAX_LOADED_THUMBNAILS));

    useEffect(() => {
        try {
            localStorage.setItem(WHEEL_MODE_KEY, wheelMode);
        } catch { }
    }, [wheelMode]);

    const applyZoom = useCallback((scale: number) => {
        const img = document.querySelector('.image-gallery-slide.image-gallery-center .image-gallery-image') as HTMLElement | null;
        if (!img) return;
        img.style.transform = scale === 1 ? '' : `scale(${scale})`;
    }, []);

    useEffect(() => {
        applyZoom(zoom);
    }, [zoom, applyZoom, resolvedImages]);

    useEffect(() => {
        handler.on('images', info => {
            setInfo(info);
            setZoom(1);
            setActiveIndex(info.current);
            setResolvedImages({});
        }).emit('images');
    }, []);

    useEffect(() => {
        const cache = imageCache.current;
        return () => {
            cache.forEach(revokeObjectUrl);
            cache.clear();
        };
    }, [info.images]);

    useEffect(() => {
        let cancelled = false;
        const cache = imageCache.current;
        for (const [index, src] of cache) {
            if (index < previewStart || index >= previewStart + MAX_LOADED_THUMBNAILS) {
                revokeObjectUrl(src);
                cache.delete(index);
            }
        }
        setResolvedImages(Object.fromEntries(cache));
        setLoading(info.images.length > 0 && !cache.has(activeIndex));

        // Serialize conversions, including work left over from a rapid slide change.
        conversionQueue.current = conversionQueue.current.then(async () => {
            const count = info.images.length;
            const indices = Array.from({ length: Math.min(count, MAX_LOADED_THUMBNAILS) },
                (_, offset) => previewStart + offset)
                .sort((a, b) => Math.abs(a - activeIndex) - Math.abs(b - activeIndex));
            for (const index of indices) {
                if (cancelled || !count) return;
                if (cache.has(index)) continue;
                try {
                    const src = await resolveImageSrc(info.images[index]);
                    if (cancelled) {
                        revokeObjectUrl(src);
                        return;
                    }
                    cache.set(index, src);
                    setResolvedImages(previous => ({ ...previous, [index]: src }));
                } catch {
                    if (!cancelled) {
                        const src = info.images[index].src ?? PLACEHOLDER;
                        cache.set(index, src);
                        setResolvedImages(previous => ({ ...previous, [index]: src }));
                    }
                } finally {
                    if (!cancelled && index === activeIndex) setLoading(false);
                }
            }
        });

        return () => {
            cancelled = true;
        };
    }, [info.images, activeIndex, previewStart]);

    const selectImage = useCallback((index: number) => {
        const count = info.images.length;
        if (!count) return;
        const next = (index + count) % count;
        setZoom(1);
        setActiveIndex(next);
        const title = info.images[next]?.title;
        if (title) handler.emit('slideTitle', title);
    }, [info.images]);

    useEffect(() => {
        const onWheel = (e: WheelEvent) => {
            if (wheelMode === 'navigate') {
                e.preventDefault();
                const direction = browseWheel.current(e, Date.now());
                if (direction) selectImage(activeIndex + direction);
                return;
            }
            e.preventDefault();
            const factor = Math.pow(1.001, -e.deltaY);
            setZoom(value => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value * factor)));
        };
        addEventListener('wheel', onWheel, { passive: false });
        return () => removeEventListener('wheel', onWheel);
    }, [wheelMode, activeIndex, selectImage]);

    // Keep every entry selectable; only thirty nearby entries receive real image URLs.
    const images = info.images.map((image: ImageSource, index: number) => {
        const inPreview = index >= previewStart && index < previewStart + MAX_LOADED_THUMBNAILS;
        const src = inPreview ? resolvedImages[index] : undefined;
        return {
            original: src ?? PLACEHOLDER,
            thumbnail: src ?? PLACEHOLDER,
            originalAlt: image.title,
            thumbnailLabel: src ? undefined : String(index + 1),
            thumbnailTitle: image.title,
            loading: 'lazy',
            thumbnailLoading: 'lazy',
        };
    });

    return (
        <div className="image-viewer">
            {loading && <div className="image-viewer__loading">Loading image…</div>}
            <div className="image-wheel-toolbar" role="toolbar" aria-label="Wheel mode">
                <button
                    type="button"
                    className={`image-wheel-toolbar__btn${wheelMode === 'zoom' ? ' is-active' : ''}`}
                    title="Scroll wheel to zoom"
                    aria-pressed={wheelMode === 'zoom'}
                    onClick={() => setWheelMode('zoom')}
                >
                    <ZoomIcon />
                    <span className="image-wheel-toolbar__label">Zoom</span>
                </button>
                <span className="image-wheel-toolbar__divider" aria-hidden="true" />
                <button
                    type="button"
                    className={`image-wheel-toolbar__btn${wheelMode === 'navigate' ? ' is-active' : ''}`}
                    title="Scroll wheel to switch images"
                    aria-pressed={wheelMode === 'navigate'}
                    onClick={() => setWheelMode('navigate')}
                >
                    <BrowseIcon />
                    <span className="image-wheel-toolbar__label">Browse</span>
                </button>
            </div>
            <ImageGallery items={images} startIndex={activeIndex} lazyLoad={true}
                slideDuration={0} showIndex={true} showFullscreenButton={false} showPlayButton={false}
                onSlide={selectImage}
            />
            <SponsorBar placement="center" />
        </div>
    );
};
