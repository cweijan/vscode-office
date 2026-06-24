import Modal from './modal';
import FormInput from './form_input';
import FormField from './form_field';
import Button from './button';
import { t } from '../locale/locale';
import { h } from './element';
import { cssPrefix } from '../config';

const fieldLabelWidth = 100;

export default class ModalHyperlink extends Modal {
  constructor() {
    const linkField = new FormField(
      new FormInput('100%', 'https://example.com'),
      { required: true },
      `${t('hyperlink.address')}:`,
      fieldLabelWidth,
    );
    const tooltipField = new FormField(
      new FormInput('100%', ''),
      {},
      `${t('hyperlink.tooltip')}:`,
      fieldLabelWidth,
    );

    super(t('contextmenu.hyperlink'), [
      h('div', `${cssPrefix}-form-fields`).children(linkField.el),
      h('div', `${cssPrefix}-form-fields`).children(tooltipField.el),
      h('div', `${cssPrefix}-buttons`).children(
        new Button('cancel').on('click', () => this.btnClick('cancel')),
        new Button('remove').on('click', () => this.btnClick('remove')),
        new Button('save', 'primary').on('click', () => this.btnClick('save')),
      ),
    ], '480px');

    this.linkField = linkField;
    this.tooltipField = tooltipField;
    this.change = () => {};
  }

  btnClick(action) {
    if (action === 'cancel') {
      this.hide();
    } else if (action === 'remove') {
      this.change('remove');
      this.hide();
    } else if (action === 'save') {
      if (!this.linkField.validate()) return;
      const link = this.linkField.val().trim();
      const tooltip = this.tooltipField.val().trim();
      this.change('save', link, tooltip || undefined);
      this.hide();
    }
  }

  setValue(v) {
    const link = v?.link ?? '';
    const tooltip = v?.tooltip ?? '';
    this.linkField.val(link);
    this.tooltipField.val(tooltip);
    this.show();
  }
}
