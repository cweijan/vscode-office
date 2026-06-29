import Item from './item';

export default class DropdownItem extends Item {
  dropdown() {}

  getValue(v) {
    return v;
  }

  element() {
    const { tag } = this;
    this.dd = this.dropdown();
    this.dd.change = (it) => {
      const value = this.getValue(it);
      this.trackTelemetry({ value });
      this.change(tag, value);
    };
    return super.element().child(
      this.dd,
    );
  }

  setState(v) {
    if (v) {
      this.value = v;
      this.dd.setTitle(v);
    }
  }
}
