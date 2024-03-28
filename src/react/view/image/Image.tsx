import ImageGallery from "react-image-gallery";
import "react-image-gallery/styles/css/image-gallery.css";
import './Image.css'
import { handler } from '../../util/vscode';
import { useEffect, useMemo, useState } from "react";

export default function Image() {
    const [info, setInfo] = useState({ images: [], current: 0 } as any);

    useEffect(() => {
        handler.on('images', info => {
            setInfo(info)
        }).emit('images')
    }, [])

    const images = info.images.map((image) => ({
        original: image.src,
        thumbnail: image.src
    }))
    //https://github.com/xiaolin/react-image-gallery
    return (
        <ImageGallery items={images} startIndex={info.current} lazyLoad={true}
            slideDuration={0} showIndex={true} showFullscreenButton={false} showPlayButton={false}
        />
    );
};
