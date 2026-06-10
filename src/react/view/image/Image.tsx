import { useCallback, useEffect, useRef, useState } from "react";
import ImageGallery from "react-image-gallery";
import "react-image-gallery/styles/css/image-gallery.css";
import { SwapOutlined, ZoomInOutlined } from '@ant-design/icons';
import { handler } from '../../util/vscode';
import './Image.less';
import { FloatButton } from 'antd';
import VSCodeLogo from "../vscode";

type WheelMode = 'navigate' | 'zoom';

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 5;

export default function Image() {
    const gallery = useRef(null)
    const [info, setInfo] = useState({ images: [], current: 0 } as any);
    const [wheelMode, setWheelMode] = useState<WheelMode>('zoom');
    const [zoom, setZoom] = useState(1);

    const applyZoom = useCallback((scale: number) => {
        const img = document.querySelector('.image-gallery-slide.image-gallery-center .image-gallery-image') as HTMLElement | null;
        if (!img) return;
        img.style.transform = scale === 1 ? '' : `scale(${scale})`;
    }, []);

    useEffect(() => {
        applyZoom(zoom);
    }, [zoom, applyZoom, info.images]);

    useEffect(() => {
        handler.on('images', info => {
            setInfo(info);
            setZoom(1);
        }).emit('images');
    }, []);

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

    const toggleWheelMode = () => {
        setWheelMode(mode => mode === 'navigate' ? 'zoom' : 'navigate');
    };

    const images = info.images.map((image) => ({
        original: image.src,
        thumbnail: image.src
    }));

    return (
        <div className="image-viewer">
            <VSCodeLogo full={false} style={{ top: 6 }} />
            <FloatButton
                className="image-wheel-mode"
                icon={wheelMode === 'zoom' ? <SwapOutlined /> : <ZoomInOutlined />}
                tooltip={wheelMode === 'zoom'
                    ? `Wheel: zoom (${Math.round(zoom * 100)}%)`
                    : 'Wheel: switch images'}
                onClick={toggleWheelMode}
            />
            <ImageGallery ref={gallery} items={images} startIndex={info.current} lazyLoad={true}
                slideDuration={0} showIndex={true} showFullscreenButton={false} showPlayButton={false}
                onSlide={() => setZoom(1)}
            />
        </div>
    );
};
