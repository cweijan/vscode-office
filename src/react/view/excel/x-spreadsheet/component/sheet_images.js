import { h } from './element';
import { cssPrefix } from '../config';
import { sheetImageDataUrl } from '../../excel_images';

export default class SheetImages {
  constructor() {
    this.el = h('div', `${cssPrefix}-sheet-images`);
    this.items = [];
    this.data = null;
  }

  reset(data) {
    this.data = data;
    this.el.html('');
    this.items = [];
    const images = data.images || [];
    for (let i = 0; i < images.length; i += 1) {
      const image = images[i];
      const imgEl = h('img')
        .attr('src', sheetImageDataUrl(image))
        .attr('draggable', 'false')
        .attr('alt', '');
      this.el.child(imgEl);
      this.items.push({ imgEl, anchor: image.anchor });
    }
    this.updatePositions();
  }

  updatePositions(data = this.data) {
    if (!data) return;
    this.data = data;
    for (let i = 0; i < this.items.length; i += 1) {
      const { imgEl, anchor } = this.items[i];
      const rect = data.getImageDisplayRect(anchor);
      if (rect.width <= 0 || rect.height <= 0) {
        imgEl.hide();
        continue;
      }
      imgEl.show().css({
        position: 'absolute',
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        objectFit: 'contain',
        pointerEvents: 'none',
        userSelect: 'none',
      });
    }
  }
}
