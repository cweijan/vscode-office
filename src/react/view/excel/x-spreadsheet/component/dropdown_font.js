import Dropdown from './dropdown';
import { h } from './element';
import { baseFonts } from '../core/font';
import { cssPrefix } from '../config';

export default class DropdownFont extends Dropdown {
  constructor() {
    const entries = baseFonts.map((it) => {
      if (it.divider) {
        return { el: h('div', `${cssPrefix}-item divider`), font: null };
      }
      return { el: h('div', `${cssPrefix}-item`).child(it.title), font: it };
    });
    const firstFont = baseFonts.find(it => !it.divider);
    super(
      firstFont.title,
      'auto',
      true,
      'bottom-left',
      ...entries.map((entry) => entry.el),
    );
    for (let i = 0; i < entries.length; i += 1) {
      const { el, font } = entries[i];
      if (!font) continue;
      el.on('click', () => {
        this.setTitle(font.title);
        this.change(font);
      });
    }
  }
}
