import { useCallback, useEffect, useRef, useState } from "react";
import ImageGallery from "react-image-gallery";
import "react-image-gallery/styles/css/image-gallery.css";
import { handler } from '../../util/vscode';
import { type ImageSource, needsConversion, resolveImageSrc, revokeObjectUrl } from './convertImage';
import './Image.less';
import SponsorBar from '../components/SponsorBar';
import { getConfigs } from '../../util/vscodeConfig';

type WheelMode = 'navigate' | 'zoom';

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 5;

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
    const gallery = useRef(null)
    const [info, setInfo] = useState({ images: [], current: 0 } as any);
    const [resolvedImages, setResolvedImages] = useState<{ original: string; thumbnail: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const [wheelMode, setWheelMode] = useState<WheelMode>('zoom');
    const [zoom, setZoom] = useState(1);
    const objectUrlsRef = useRef<string[]>([]);

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
        }).emit('images');
    }, []);

    useEffect(() => {
        let cancelled = false;
        for (const url of objectUrlsRef.current) {
            revokeObjectUrl(url);
        }
        objectUrlsRef.current = [];

        if (!info.images.length) {
            setResolvedImages([]);
            setLoading(false);
            return;
        }

        const hasResolvable = info.images.some((image: ImageSource) =>
            needsConversion(image) || !!image.buffer?.length
        );
        if (hasResolvable) {
            setLoading(true);
        }

        (async () => {
            const resolved: { original: string; thumbnail: string }[] = [];
            for (const image of info.images) {
                if (cancelled) return;
                try {
                    const src = await resolveImageSrc(image);
                    if (src.startsWith('blob:')) {
                        objectUrlsRef.current.push(src);
                    }
                    resolved.push({ original: src, thumbnail: src });
                } catch {
                    resolved.push({ original: image.src ?? '', thumbnail: image.src ?? '' });
                }
            }
            if (!cancelled) {
                setResolvedImages(resolved);
                setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
            for (const url of objectUrlsRef.current) {
                revokeObjectUrl(url);
            }
            objectUrlsRef.current = [];
        };
    }, [info.images]);

    useEffect(() => {
        let previous = 0;
        const onWheel = (e: WheelEvent) => {
            if (wheelMode === 'navigate') {
                if (Date.now() - previous < 300) return;
                previous = Date.now();
                const current = gallery.current.getCurrentIndex();
                gallery.current.slideToIndex(current + (e.deltaY > 0 ? 1 : -1));
                return;
            }
            e.preventDefault();
            const factor = Math.pow(1.001, -e.deltaY);
            setZoom(value => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value * factor)));
        };
        addEventListener('wheel', onWheel, { passive: false });
        return () => removeEventListener('wheel', onWheel);
    }, [wheelMode]);

    const images = resolvedImages.length ? resolvedImages : info.images.map((image: { src: string }) => ({
        original: image.src,
        thumbnail: image.src
    }));

    const hasSponsor = !!getConfigs()?.sponsorBaseUrl;

    return (
        <div className={`image-viewer${hasSponsor ? '' : ' image-viewer--no-sponsor'}`}>
            {loading && <div className="image-viewer__loading">Converting image…</div>}
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
            <ImageGallery ref={gallery} items={images} startIndex={info.current} lazyLoad={true}
                slideDuration={0} showIndex={true} showFullscreenButton={false} showPlayButton={false}
                onSlide={(index) => {
                    setZoom(1);
                    const title = info.images[index]?.title;
                    if (title) handler.emit('slideTitle', title);
                }}
            />
            {hasSponsor && <SponsorBar placement="center" />}
        </div>
    );
};
