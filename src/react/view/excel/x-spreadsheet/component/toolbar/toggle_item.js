import Item from './item';
import Icon from '../icon';

export default class ToggleItem extends Item {
  element() {
    const { tag } = this;
    return super.element()
      .child(new Icon(tag))
      .on('click', () => this.click());
  }

  click() {
    const next = this.toggle();
    this.trackTelemetry({ active: next });
    this.change(this.tag, next);
  }

  setState(active) {
    this.el.active(active);
  }

  toggle() {
    return this.el.toggle();
  }

  active() {
    return this.el.hasClass('active');
  }
}
