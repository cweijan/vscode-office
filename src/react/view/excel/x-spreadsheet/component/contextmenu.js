import { h } from './element';
import { bindClickoutside, unbindClickoutside } from './event';
import { cssPrefix } from '../config';
import { tf } from '../locale/locale';

const menuItems = [
  { key: 'copy',             title: tf('contextmenu.copy'),           label: 'Ctrl+C',       icon: 'copy' },
  { key: 'cut',              title: tf('contextmenu.cut'),            label: 'Ctrl+X',       icon: 'scissors' },
  { key: 'paste',            title: tf('contextmenu.paste'),          label: 'Ctrl+V',       icon: 'clippy' },
  { key: 'paste-value',      title: tf('contextmenu.pasteValue'),     label: 'Ctrl+Shift+V', icon: 'symbol-numeric' },
  { key: 'paste-format',     title: tf('contextmenu.pasteFormat'),    label: 'Ctrl+Alt+V',   icon: 'paintcan' },
  { key: 'divider' },
  { key: 'insert-row',       title: tf('contextmenu.insertRow'),                             icon: 'insert' },
  { key: 'insert-column',    title: tf('contextmenu.insertColumn'),                          icon: 'insert' },
  { key: 'divider' },
  { key: 'delete-row',       title: tf('contextmenu.deleteRow'),                             icon: 'trash' },
  { key: 'delete-column',    title: tf('contextmenu.deleteColumn'),                          icon: 'trash' },
  { key: 'delete-cell-text', title: tf('contextmenu.deleteCellText'),                        icon: 'clear-all' },
  { key: 'hide',             title: tf('contextmenu.hide'),                                  icon: 'eye-closed' },
  { key: 'divider' },
  { key: 'hyperlink',        title: tf('contextmenu.hyperlink'),                             icon: 'link' },
  { key: 'validation',       title: tf('contextmenu.validation'),                            icon: 'checklist' },
  { key: 'divider' },
  { key: 'cell-editable',     title: tf('contextmenu.celleditable'),                         icon: 'edit' },
  { key: 'cell-non-editable', title: tf('contextmenu.cellnoneditable'),                      icon: 'lock' },
];

function buildMenuItem(item) {
  if (item.key === 'divider') {
    return h('div', `${cssPrefix}-item divider`);
  }
  return h('div', `${cssPrefix}-item`)
    .on('click', () => {
      this.itemClick(item.key);
      this.hide();
    })
    .children(
      h('i', `codicon codicon-${item.icon}`),
      h('span', 'menu-title').child(item.title()),
      h('div', 'label').child(item.label || ''),
    );
}

function buildMenu() {
  return menuItems.map(it => buildMenuItem.call(this, it));
}

export default class ContextMenu {
  constructor(viewFn, isHide = false) {
    this.menuItems = buildMenu.call(this);
    this.el = h('div', `${cssPrefix}-contextmenu`)
      .children(...this.menuItems)
      .hide();
    this.viewFn = viewFn;
    this.itemClick = () => {};
    this.isHide = isHide;
    this.setMode('range');
  }

  // row-col: the whole rows or the whole cols
  // range: select range
  setMode(mode) {
    const hideEl = this.menuItems[12];
    if (mode === 'row-col') {
      hideEl.show();
    } else {
      hideEl.hide();
    }
  }

  hide() {
    const { el } = this;
    el.hide();
    unbindClickoutside(el);
  }

  setPosition(x, y) {
    if (this.isHide) return;
    const { el } = this;
    const { width } = el.show().offset();
    const view = this.viewFn();
    const vhf = view.height / 2;
    let left = x;
    if (view.width - x <= width) {
      left -= width;
    }
    el.css('left', `${left}px`);
    if (y > vhf) {
      el.css('bottom', `${view.height - y}px`)
        .css('max-height', `${y}px`)
        .css('top', 'auto');
    } else {
      el.css('top', `${y}px`)
        .css('max-height', `${view.height - y}px`)
        .css('bottom', 'auto');
    }
    bindClickoutside(el);
  }
}
