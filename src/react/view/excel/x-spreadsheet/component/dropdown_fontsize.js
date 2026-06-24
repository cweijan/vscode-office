import Dropdown from './dropdown';
import { h } from './element';
import { fontSizes } from '../core/font';
import { cssPrefix } from '../config';

export default class DropdownFontSize extends Dropdown {
  constructor() {
    const entries = fontSizes.map((it) => ({
      el: h('div', `${cssPrefix}-item`).child(`${it.pt}`),
      size: it,
    }));
    super(
      '12',
      'auto',
      true,
      'bottom-left',
      ...entries.map((entry) => entry.el),
    );
    for (let i = 0; i < entries.length; i += 1) {
      const { el, size } = entries[i];
      el.on('click', () => {
        this.setTitle(`${size.pt}`);
        this.change(size);
      });
    }
  }
}
