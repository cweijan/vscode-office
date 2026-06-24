import Item from './item';
import Icon from '../icon';

export default class Save extends Item {
  constructor() {
    super('save', 'Ctrl+S');
    this.el.disabled(true);
  }

  element() {
    return super.element()
      .child(new Icon('save'))
      .on('click', () => {
        if (!this.el.el.classList.contains('disabled')) {
          this.change('save');
        }
      });
  }

  setEnabled(enabled) {
    this.el.disabled(!enabled);
  }
}
