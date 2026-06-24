import Dropdown from './dropdown';
import { h } from './element';
import Icon from './icon';
import { cssPrefix } from '../config';
import { t } from '../locale/locale';

export default class DropdownAlign extends Dropdown {
  constructor(aligns, align, labelGroup = 'align') {
    const entries = aligns.map((it) => ({
      el: h('div', `${cssPrefix}-item`)
        .child(new Icon(`align-${it}`))
        .child(t(`${labelGroup}.${it}`)),
      align: it,
    }));
    const icon = new Icon(`align-${align}`);
    super(icon, 'auto', true, 'bottom-left', ...entries.map((entry) => entry.el));
    for (let i = 0; i < entries.length; i += 1) {
      const { el, align: alignValue } = entries[i];
      el.on('click', () => {
        this.setTitle(alignValue);
        this.change(alignValue);
      });
    }
  }

  setTitle(align) {
    this.title.setName(`align-${align}`);
    this.hide();
  }
}
