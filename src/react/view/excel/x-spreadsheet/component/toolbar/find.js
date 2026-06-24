import Item from './item';
import Icon from '../icon';

export default class Find extends Item {
  constructor() {
    super('find');
  }

  element() {
    return super.element()
      .child(new Icon('find'))
      .on('click', () => this.change('find', true));
  }
}
