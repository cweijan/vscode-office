import Item from './item';
import Icon from '../icon';

export default class SaveAs extends Item {
  constructor() {
    super('saveAs', '');
    this.el.disabled(false);
  }

  element() {
    return super.element()
      .child(new Icon('save-as'))
      .on('click', () => {
        this.trackTelemetry();
        this.change('save-as');
      });
  }
}
