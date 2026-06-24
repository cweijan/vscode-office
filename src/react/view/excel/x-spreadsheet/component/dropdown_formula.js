import Dropdown from './dropdown';
import Icon from './icon';
import { h } from './element';
import { formulaMenuItems, formulaDisplayName } from '../core/formula';
import { cssPrefix } from '../config';

export default class DropdownFormula extends Dropdown {
  constructor() {
    const entries = formulaMenuItems.map((it) => {
      if (it.divider) {
        return {
          el: h('div', `${cssPrefix}-item`).addClass('divider'),
          formula: null,
        };
      }
      return {
        el: h('div', `${cssPrefix}-item`).child(formulaDisplayName(it.key)),
        formula: it,
      };
    });
    super(
      new Icon('formula'),
      '180px',
      true,
      'bottom-left',
      ...entries.map((entry) => entry.el),
    );
    for (let i = 0; i < entries.length; i += 1) {
      const { el, formula } = entries[i];
      if (!formula) continue;
      el.on('click', () => {
        this.hide();
        this.change(formula);
      });
    }
  }
}
