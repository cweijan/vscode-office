import { useEffect, useRef, useState } from "react";
import ImageGallery from "react-image-gallery";
import "react-image-gallery/styles/css/image-gallery.css";
import { handler } from '../../util/vscode';
import './Image.less';

export default function Image() {
    const gallery = useRef(null)
    const [info, setInfo] = useState({ images: [], current: 0 } as any);

    useEffect(() => {
        handler.on('images', info => {
            setInfo(info)
        }).emit('images')
        let previous = 0;
        addEventListener('wheel', (e) => {
            if (new Date().getTime() - previous < 300) return;
            const current = gallery.current.getCurrentIndex();
            gallery.current.slideToIndex(current + (e.deltaY > 0 ? 1 : -1))
            previous = new Date().getTime();
        })
    }, [])
    const images = info.images.map((image) => ({
        original: image.src,
        thumbnail: image.src
    }))
    return (
        <ImageGallery ref={gallery} items={images} startIndex={info.current} lazyLoad={true}
            slideDuration={0} showIndex={true} showFullscreenButton={false} showPlayButton={false}
        />
    );
};
